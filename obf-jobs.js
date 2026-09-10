'use strict';
/**
 * Solo QyrexOBF MAX. Lua 5.1 estático (sin .so) para Render Native Node.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const JOB_ROOT = path.join(__dirname, 'obf-jobs');
try { fs.mkdirSync(JOB_ROOT, { recursive: true }); } catch (_) {}

if (!process.env.QYREX_ENGINES) {
  process.env.QYREX_ENGINES = path.join(__dirname, 'engines');
}

const jobs = new Map();
const children = new Map();
const HEADER = '-- This file was protected using Qyrex Obfuscator v10.3 [https://qyrex.hopto.org]\n';
const TMP_BIN = path.join(require('os').tmpdir(), 'qyrex-lua-bin');

function withHeader(code) {
  const c = String(code || '');
  if (!c) return c;
  if (c.startsWith('-- This file was protected')) return c;
  return HEADER + c;
}

function probeLua(bin) {
  if (!bin || !fs.existsSync(bin)) return false;
  try {
    execFileSync(bin, ['-v'], { stdio: 'pipe', timeout: 8000 });
    return true;
  } catch (e) {
    return false;
  }
}

function installStaticLua(root) {
  const bins = require('./lua-bins');
  const targets = [];
  if (root) targets.push(path.join(root, 'bin'));
  targets.push(TMP_BIN);

  let lastLua = null;
  for (const binDir of targets) {
    try {
      fs.mkdirSync(binDir, { recursive: true });
      const luaPath = path.join(binDir, 'lua5.1');
      const luacPath = path.join(binDir, 'luac5.1');
      fs.writeFileSync(luaPath, Buffer.from(bins.lua5_1, 'base64'));
      fs.writeFileSync(luacPath, Buffer.from(bins.luac5_1, 'base64'));
      fs.chmodSync(luaPath, 0o755);
      fs.chmodSync(luacPath, 0o755);
      // Also plain names for PATH tools
      try {
        fs.writeFileSync(path.join(binDir, 'lua'), fs.readFileSync(luaPath));
        fs.writeFileSync(path.join(binDir, 'luac'), fs.readFileSync(luacPath));
        fs.chmodSync(path.join(binDir, 'lua'), 0o755);
        fs.chmodSync(path.join(binDir, 'luac'), 0o755);
      } catch (_) {}
      if (probeLua(luaPath)) {
        lastLua = luaPath;
        console.log('[QyrexOBF] lua OK @', luaPath);
      } else {
        console.warn('[QyrexOBF] lua escrito pero no ejecuta @', luaPath, 'arch=' + process.arch + ' platform=' + process.platform);
      }
    } catch (e) {
      console.warn('[QyrexOBF] install en', binDir, e.message);
    }
  }
  // Prefer TMP in PATH
  process.env.PATH = TMP_BIN + ':' + (root ? path.join(root, 'bin') + ':' : '') + (process.env.PATH || '');
  return lastLua;
}

let maxEngine = null;
try {
  maxEngine = require('./qyrexobf-engine');
  try {
    const root = maxEngine.getRoot();
    installStaticLua(root);
    console.log('[QyrexOBF] MAX engines=', root, 'findLua=', maxEngine.findLua && maxEngine.findLua());
  } catch (e) {
    console.warn('[QyrexOBF] extract:', e && e.message);
  }
} catch (e) {
  console.error('[QyrexOBF] engine load fail:', e && e.message);
}

function metaPath(id) { return path.join(JOB_ROOT, id, 'meta.json'); }
function readMeta(id) {
  try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')); } catch (_) { return null; }
}
function writeMeta(id, patch) {
  const dir = path.join(JOB_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  const cur = readMeta(id) || { id, logs: [], createdAt: Date.now() };
  const logs = Array.isArray(cur.logs) ? cur.logs.slice(-80) : [];
  if (patch.logLine) {
    logs.push('[' + new Date().toISOString().slice(11, 19) + '] ' + patch.logLine);
    delete patch.logLine;
  }
  const next = Object.assign({}, cur, patch, {
    logs,
    lastLog: logs.length ? logs[logs.length - 1] : cur.lastLog,
    updatedAt: Date.now()
  });
  fs.writeFileSync(metaPath(id), JSON.stringify(next), 'utf8');
  jobs.set(id, next);
  return next;
}

function ensureMaxReady() {
  if (!maxEngine) throw new Error('QyrexOBF MAX no cargado (qyrexobf-engine.js)');
  if (!fs.existsSync(path.join(__dirname, 'qyrexobf-worker.js'))) {
    throw new Error('qyrexobf-worker.js faltante');
  }
  if (process.platform !== 'linux' || (process.arch !== 'x64' && process.arch !== 'x86_64')) {
    throw new Error('Host ' + process.platform + '/' + process.arch + ' — se necesita linux x64');
  }
  const root = maxEngine.getRoot();
  const luaPath = installStaticLua(root);
  // findLua may still point to broken pack bin — verify concrete paths
  const candidates = [
    luaPath,
    path.join(TMP_BIN, 'lua5.1'),
    path.join(root, 'bin', 'lua5.1'),
    maxEngine.findLua && maxEngine.findLua()
  ].filter(Boolean);

  for (const c of candidates) {
    if (probeLua(c)) {
      // Monkey-patch findLua so worker/engine always get a working binary
      maxEngine.findLua = function () { return c; };
      maxEngine.findLuac = function () {
        const d = path.dirname(c);
        const a = path.join(d, 'luac5.1');
        const b = path.join(d, 'luac');
        if (fs.existsSync(a)) return a;
        if (fs.existsSync(b)) return b;
        return a;
      };
      return true;
    }
  }

  // Diagnose
  let detail = 'arch=' + process.arch + ' platform=' + process.platform;
  try {
    const test = path.join(TMP_BIN, 'lua5.1');
    execFileSync(test, ['-v'], { stdio: 'pipe', timeout: 5000 });
  } catch (e) {
    detail += ' errno=' + (e && e.code) + ' msg=' + String(e && e.message || '').slice(0, 120);
  }
  throw new Error('lua5.1 no ejecutable en este host. ' + detail);
}

function startMaxWorker(id, source, opts) {
  ensureMaxReady();
  const dir = path.join(JOB_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'in.lua'), source, 'utf8');
  writeMeta(id, {
    id,
    status: 'running',
    progress: 4,
    stage: 'spawn',
    createdAt: Date.now(),
    opts: Object.assign({ antiTamper: true }, opts || {}),
    logLine: 'QyrexOBF MAX · worker arrancando'
  });

  const workerJs = path.join(__dirname, 'qyrexobf-worker.js');
  const child = spawn(process.execPath, [workerJs, dir], {
    cwd: __dirname,
    env: Object.assign({}, process.env, {
      PATH: TMP_BIN + ':' + path.join(maxEngine.getRoot(), 'bin') + ':' + (process.env.PATH || ''),
      QYREX_ENGINES: process.env.QYREX_ENGINES,
      QYREX_LUA: path.join(TMP_BIN, 'lua5.1'),
      QYREX_LUAC: path.join(TMP_BIN, 'luac5.1')
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  children.set(id, child);

  const beat = setInterval(() => {
    const m = readMeta(id);
    if (!m || m.status === 'done' || m.status === 'error') {
      clearInterval(beat);
      return;
    }
    let p = Number(m.progress) || 4;
    if (p < 97) p = Math.min(97, p + (p < 88 ? 1 : 0.25));
    writeMeta(id, {
      progress: Math.round(p * 10) / 10,
      elapsedMs: Date.now() - (m.createdAt || Date.now())
    });
  }, 2000);

  child.stdout.on('data', (b) => {
    const line = String(b).trim();
    if (line) console.log('[obf ' + id.slice(0, 6) + ']', line);
  });
  child.stderr.on('data', (b) => {
    const line = String(b).trim().slice(0, 240);
    if (line) writeMeta(id, { logLine: line });
  });
  child.on('exit', (code) => {
    clearInterval(beat);
    children.delete(id);
    const m = readMeta(id) || {};
    if (m.status === 'done' || m.status === 'error') return;
    if (code === 0) {
      try {
        let out = fs.readFileSync(path.join(dir, 'out.lua'), 'utf8');
        out = withHeader(out);
        writeMeta(id, {
          status: 'done',
          progress: 100,
          stage: 'done',
          code: out,
          originalSize: String(source).length,
          obfuscatedSize: out.length,
          logLine: 'DONE MAX · ' + out.length + ' B'
        });
      } catch (_) {
        writeMeta(id, {
          status: 'error',
          progress: 100,
          stage: 'error',
          error: 'Worker OK pero sin out.lua',
          logLine: 'ERROR sin output'
        });
      }
    } else {
      writeMeta(id, {
        status: 'error',
        progress: 100,
        stage: 'error',
        error: m.error || ('Worker exit ' + code),
        logLine: 'ERROR exit ' + code
      });
    }
  });
}

async function startJob(source, opts) {
  const id = crypto.randomBytes(8).toString('hex');
  try {
    ensureMaxReady();
  } catch (e) {
    writeMeta(id, {
      id,
      status: 'error',
      progress: 100,
      stage: 'error',
      createdAt: Date.now(),
      error: e.message,
      logLine: 'ERROR: ' + e.message
    });
    return id;
  }
  startMaxWorker(id, String(source || ''), opts || { antiTamper: true });
  return id;
}

function getJob(id) {
  return readMeta(id) || jobs.get(id) || null;
}

module.exports = { startJob, getJob, withHeader, ensureMaxReady };
