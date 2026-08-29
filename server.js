'use strict';

const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(express.json({ limit: '64kb', strict: true }));

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;
const MASTER_SECRET = process.env.QYREX_MASTER_SECRET || 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_32B+';
const ADMIN_TOKEN = process.env.QYREX_ADMIN_TOKEN || 'CHANGE_THIS_ADMIN_TOKEN';
const SESSION_TTL_MS = 25_000;
const MAX_SESSIONS = 10_000;
const MIN_CHUNK = 3_000;
const MAX_CHUNK = 8_000;
const DECOY_RATIO = 0.18;

if (MASTER_SECRET.length < 32 || MASTER_SECRET.startsWith('CHANGE_THIS')) {
  console.warn('[WARN] Set QYREX_MASTER_SECRET to a random secret of at least 32 characters.');
}
if (ADMIN_TOKEN.startsWith('CHANGE_THIS')) {
  console.warn('[WARN] Set QYREX_ADMIN_TOKEN before exposing admin endpoints.');
}

const scripts = new Map();
const sessions = new Map();
const keyStore = new Map();
const rateBuckets = new Map();

function now() { return Date.now(); }
function b64(buf) { return Buffer.from(buf).toString('base64url'); }
function unb64(v) { return Buffer.from(v, 'base64url'); }
function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function randomHex(bytes = 16) { return crypto.randomBytes(bytes).toString('hex'); }
function hmac(data, secret = MASTER_SECRET) { return crypto.createHmac('sha256', secret).update(data).digest('hex'); }
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function clientIp(req) {
  const ip = req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}
function fingerprint(req) {
  return sha256(`${clientIp(req)}\n${req.get('user-agent') || ''}`);
}
function securityHeaders(res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
    'Referrer-Policy': 'no-referrer',
  });
}
function decoyLua() {
  const lines = [
    '-- Qyrex protected delivery',
    'local __qyrex_decoy = true',
    'local __n = 0',
    'for i = 1, 7 do __n = __n + i end',
    'if __qyrex_decoy and __n == 28 then',
    '    print("skidder noob")',
    'end',
  ];
  return lines.join('\n');
}
function jsonStable(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
function xorBuffer(data, key) {
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}
function deriveChunkKey(sessionKey, salt) {
  return crypto.hkdfSync('sha256', sessionKey, salt, Buffer.from('QyrexApi/A-D/v3/chunk'), 32);
}
function aesEncrypt(plaintext, key, aad) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, ciphertext };
}
function aesDecrypt(ciphertext, key, iv, tag, aad) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
function chooseChunkSize() {
  return Math.floor(MIN_CHUNK + Math.random() * (MAX_CHUNK - MIN_CHUNK + 1));
}
function splitPayload(source) {
  const src = Buffer.from(source, 'utf8');
  const chunks = [];
  let pos = 0;
  while (pos < src.length) {
    const size = Math.min(chooseChunkSize(), src.length - pos);
    chunks.push(src.subarray(pos, pos + size));
    pos += size;
  }
  return chunks;
}
function ensureScript(scriptId) {
  const script = scripts.get(scriptId);
  if (!script) throw new Error('script_not_found');
  return script;
}
function buildProtectedScript(source) {
  const realChunks = splitPayload(source);
  const out = [];
  let realIndex = 0;
  for (const chunk of realChunks) {
    out.push({ type: 'real', index: realIndex++, data: chunk });
    if (Math.random() < DECOY_RATIO) {
      const decoy = Buffer.from(`-- decoy-${randomHex(5)}\nlocal __d${randomHex(3)}=${Math.floor(Math.random() * 999999)}\n`);
      out.push({ type: 'decoy', index: -1, data: decoy });
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { realChunks, deliveryChunks: out };
}
function makeChainToken(sessionId, seq, nonce) {
  const payload = `${sessionId}.${seq}.${nonce}`;
  return `${payload}.${hmac(payload)}`;
}
function parseChainToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [sessionId, seqText, nonce, mac] = parts;
  const seq = Number(seqText);
  if (!sessionId || !nonce || !Number.isInteger(seq)) return null;
  const payload = `${sessionId}.${seq}.${nonce}`;
  if (!timingSafeEqualHex(hmac(payload), mac)) return null;
  return { sessionId, seq, nonce };
}
function issueSignedChallenge(session, seq) {
  const nonce = randomHex(12);
  return makeChainToken(session.id, seq, nonce);
}
function punishSession(session, reason) {
  if (!session) return;
  session.destroyed = true;
  session.destroyReason = reason;
  sessions.delete(session.id);
}
function genericDecoyResponse(res) {
  securityHeaders(res);
  res.status(200).type('text/plain').send(decoyLua());
}
function requireJsonBody(req, keys) {
  if (!req.body || typeof req.body !== 'object') return false;
  return keys.every(k => typeof req.body[k] === 'string' && req.body[k].length > 0);
}
function rateLimit(key, limit, windowMs) {
  const t = now();
  let b = rateBuckets.get(key);
  if (!b || t - b.start >= windowMs) {
    b = { start: t, count: 0 };
    rateBuckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}
function cleanup() {
  const t = now();
  for (const [id, s] of sessions) if (s.expiresAt <= t || s.destroyed) sessions.delete(id);
  for (const [k, b] of rateBuckets) if (t - b.start > 10 * 60_000) rateBuckets.delete(k);
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.values()].sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 0; i < Math.floor(sessions.size * 0.1); i++) sessions.delete(oldest[i].id);
  }
}
setInterval(cleanup, 5_000).unref();

function loadDemoScript() {
  const demo = [
    'local function __qyrex_entry()',
    '    print("Protected script loaded")',
    'end',
    '__qyrex_entry()',
  ].join('\n');
  scripts.set('demo', { id: 'demo', source: demo, updatedAt: now() });
}
loadDemoScript();

// Optional persistent key loading. Format: [{"key":"...","scriptId":"...","expiresAt":null,"usesLeft":null}]
function loadKeysFromFile() {
  const file = process.env.QYREX_KEYS_FILE;
  if (!file || !fs.existsSync(file)) return;
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) throw new Error('keys file must be array');
    for (const item of list) {
      if (item?.key && item?.scriptId) keyStore.set(item.key, {
        scriptId: item.scriptId,
        expiresAt: item.expiresAt ? new Date(item.expiresAt).getTime() : null,
        usesLeft: Number.isFinite(item.usesLeft) ? item.usesLeft : null,
      });
    }
  } catch (err) {
    console.error('[KEYS] failed to load:', err.message);
  }
}
loadKeysFromFile();

function validateAccessKey(key, scriptId) {
  const record = keyStore.get(key);
  if (!record) return false;
  if (record.scriptId !== scriptId) return false;
  if (record.expiresAt && record.expiresAt <= now()) return false;
  if (record.usesLeft !== null && record.usesLeft <= 0) return false;
  return true;
}

function adminOnly(req, res, next) {
  const supplied = req.get('x-qyrex-admin') || '';
  if (!timingSafeEqualHex(hmac(supplied), hmac(ADMIN_TOKEN))) {
    return res.status(404).end();
  }
  next();
}

app.get('/health', (req, res) => {
  securityHeaders(res);
  res.json({ ok: true, service: 'QyrexApi Anti-Dump v3' });
});

// Admin: publish/replace a script in memory.
app.post('/api/v3/admin/scripts', adminOnly, (req, res) => {
  if (!requireJsonBody(req, ['scriptId', 'source'])) return res.status(400).json({ error: 'invalid_body' });
  if (req.body.scriptId.length > 80 || req.body.source.length > 5_000_000) return res.status(413).json({ error: 'too_large' });
  scripts.set(req.body.scriptId, { id: req.body.scriptId, source: req.body.source, updatedAt: now() });
  securityHeaders(res);
  res.json({ ok: true, scriptId: req.body.scriptId, sha256: sha256(req.body.source) });
});

// Admin: add a key mapping. In a production deployment use your existing key DB here.
app.post('/api/v3/admin/keys', adminOnly, (req, res) => {
  if (!requireJsonBody(req, ['key', 'scriptId'])) return res.status(400).json({ error: 'invalid_body' });
  keyStore.set(req.body.key, {
    scriptId: req.body.scriptId,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt).getTime() : null,
    usesLeft: req.body.usesLeft === undefined ? null : Number(req.body.usesLeft),
  });
  securityHeaders(res);
  res.json({ ok: true });
});

// One-time handshake. Access is bound to IP + UA and the returned token expires rapidly.
app.post('/api/v3/handshake', (req, res) => {
  const ip = clientIp(req);
  const ua = req.get('user-agent') || '';
  if (!rateLimit(`hs:${ip}`, 12, 60_000)) return genericDecoyResponse(res);
  if (ua.length < 4 || ua.length > 512) return genericDecoyResponse(res);
  if (!requireJsonBody(req, ['scriptId', 'key'])) return genericDecoyResponse(res);
  if (!validateAccessKey(req.body.key, req.body.scriptId)) return genericDecoyResponse(res);
  if (sessions.size >= MAX_SESSIONS) return genericDecoyResponse(res);

  let script;
  try { script = ensureScript(req.body.scriptId); } catch { return genericDecoyResponse(res); }

  const { deliveryChunks } = buildProtectedScript(script.source);
  const sessionKey = crypto.randomBytes(32);
  const sessionId = randomHex(18);
  const session = {
    id: sessionId,
    createdAt: now(),
    expiresAt: now() + SESSION_TTL_MS,
    boundFingerprint: fingerprint(req),
    key: req.body.key,
    scriptId: req.body.scriptId,
    sessionKey,
    expectedSeq: 0,
    nextChunkCursor: 0,
    deliveryChunks,
    usedChunkRequests: new Set(),
    destroyed: false,
  };
  sessions.set(sessionId, session);

  // Session-specific wrapping key for each chunk is derived from this ephemeral secret.
  // The loader receives the session key encoded as base64url; transport confidentiality is
  // supplied by HTTPS. The server never exposes its MASTER_SECRET or chain MAC secret.
  const manifestId = randomHex(12);
  const manifest = {
    v: 3,
    sessionId,
    scriptId: req.body.scriptId,
    manifestId,
    ttlMs: SESSION_TTL_MS,
    total: deliveryChunks.length,
    realCount: deliveryChunks.filter(c => c.type === 'real').length,
    firstChallenge: issueSignedChallenge(session, 0),
    sessionKey: b64(sessionKey),
    sourceSha256: sha256(script.source),
  };

  securityHeaders(res);
  res.json(manifest);
});

// Sequential chunk endpoint. A valid server-signed challenge is consumed once and advances the chain.
app.post('/api/v3/chunk', (req, res) => {
  const ip = clientIp(req);
  if (!rateLimit(`chunk:${ip}`, 300, 60_000)) return genericDecoyResponse(res);
  if (!requireJsonBody(req, ['sessionId', 'challenge'])) return genericDecoyResponse(res);

  const parsed = parseChainToken(req.body.challenge);
  if (!parsed) return genericDecoyResponse(res);
  const session = sessions.get(parsed.sessionId);
  if (!session || session.destroyed || session.expiresAt <= now()) return genericDecoyResponse(res);
  if (session.boundFingerprint !== fingerprint(req)) {
    punishSession(session, 'fingerprint_mismatch');
    return genericDecoyResponse(res);
  }
  if (parsed.seq !== session.expectedSeq) {
    punishSession(session, 'out_of_order');
    return genericDecoyResponse(res);
  }
  const requestKey = `${parsed.seq}:${parsed.nonce}`;
  if (session.usedChunkRequests.has(requestKey)) {
    punishSession(session, 'duplicate');
    return genericDecoyResponse(res);
  }
  session.usedChunkRequests.add(requestKey);

  const chunk = session.deliveryChunks[session.nextChunkCursor];
  if (!chunk) {
    session.expectedSeq += 1;
    const finalChallenge = issueSignedChallenge(session, session.expectedSeq);
    const mac = hmac(`${session.id}|complete|${sha256(session.scriptId)}`);
    sessions.delete(session.id);
    securityHeaders(res);
    return res.json({ done: true, challenge: finalChallenge, mac });
  }

  const aad = Buffer.from(`${session.id}|${session.nextChunkCursor}|${chunk.type}|${chunk.index}`, 'utf8');
  const salt = crypto.randomBytes(16);
  const chunkKey = deriveChunkKey(session.sessionKey, salt);
  const encrypted = aesEncrypt(chunk.data, chunkKey, aad);
  const transportMask = crypto.createHash('sha256').update(session.sessionKey).update(salt).digest();
  const maskedCipher = xorBuffer(encrypted.ciphertext, transportMask);

  const response = {
    done: false,
    cursor: session.nextChunkCursor,
    type: chunk.type,
    index: chunk.index,
    salt: b64(salt),
    iv: b64(encrypted.iv),
    tag: b64(encrypted.tag),
    aad: b64(aad),
    ciphertext: b64(maskedCipher),
    ciphertextSha256: sha256(maskedCipher),
    sha256: sha256(chunk.data),
    challenge: issueSignedChallenge(session, session.expectedSeq + 1),
  };

  session.nextChunkCursor += 1;
  session.expectedSeq += 1;
  if (session.usedChunkRequests.size > session.deliveryChunks.length + 5) punishSession(session, 'too_many_requests');

  securityHeaders(res);
  res.json(response);
});

// Public fallback endpoint intentionally returns decoy only. Do not expose a direct source route.
app.get('/api/v3/public/:scriptId', (req, res) => genericDecoyResponse(res));
app.get('/api/v3/cache/public/:scriptId/download', (req, res) => genericDecoyResponse(res));

app.use((err, req, res, next) => {
  console.error('[HTTP]', err?.message || err);
  securityHeaders(res);
  if (res.headersSent) return next(err);
  res.status(500).type('text/plain').send(decoyLua());
});

app.listen(PORT, () => {
  console.log(`[QyrexApi] Anti-Dump v3 listening on ${PUBLIC_BASE_URL}`);
});

module.exports = { app, scripts, sessions, keyStore };
