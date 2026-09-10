'use strict';
/**
 * Cliente remoto de QyrexOBF → https://qyrexobfff.onrender.com
 * No usa lua ni engines locales. Solo HTTP.
 */
const crypto = require('crypto');

const DEFAULT_BASE = 'https://qyrexobfff.onrender.com';
const HEADER = '-- This file was protected using Qyrex Obfuscator v10.3 [https://qyrex.hopto.org]\n';

function withHeader(code) {
  const c = String(code || '');
  if (!c) return c;
  if (c.startsWith('-- This file was protected')) return c;
  return HEADER + c;
}

function baseUrl() {
  return String(process.env.QYREXOBF_URL || DEFAULT_BASE).replace(/\/+$/, '');
}

function apiHeaders() {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const key = process.env.QYREXOBF_API_KEY || process.env.API_KEY || 'qyrex_obf_7f3a9c2e1b8d4e6f0a1c2d3e4f5a6b7c';
  if (key) h['x-api-key'] = key;
  return h;
}

const jobs = new Map(); // id local → estado espejo del remoto

function writeJob(id, patch) {
  const cur = jobs.get(id) || { id, logs: [], createdAt: Date.now() };
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
  jobs.set(id, next);
  return next;
}

async function remoteFetch(path, opts) {
  const url = baseUrl() + path;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 60000);
  try {
    const res = await fetch(url, {
      method: (opts && opts.method) || 'GET',
      headers: apiHeaders(),
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Arranca ofuscación en qyrexobfff.onrender.com y hace poll hasta done/error.
 * Expone progreso en jobs Map para GET /api/obf-jobs/:id
 */
async function runRemoteObf(localId, source, opts) {
  writeJob(localId, {
    status: 'running',
    progress: 5,
    stage: 'remote',
    logLine: 'Conectando a QyrexOBF (' + baseUrl() + ')…'
  });

  const start = await remoteFetch('/obfuscate', {
    method: 'POST',
    timeout: 90000,
    body: {
      source: String(source || ''),
      antiTamper: !(opts && opts.antiTamper === false),
      mode: 'max'
    }
  });

  if (!start.ok || !start.data) {
    const err = (start.data && (start.data.error || start.data.raw)) || ('HTTP ' + start.status);
    writeJob(localId, {
      status: 'error',
      progress: 100,
      stage: 'error',
      error: String(err).slice(0, 500),
      logLine: 'ERROR al iniciar: ' + String(err).slice(0, 200)
    });
    return;
  }

  // Sync response with code
  if (start.data.code && start.data.success) {
    const code = withHeader(start.data.code);
    writeJob(localId, {
      status: 'done',
      progress: 100,
      stage: 'done',
      code,
      originalSize: String(source).length,
      obfuscatedSize: code.length,
      steps: start.data.steps || ['QyrexOBF-remote'],
      logLine: 'DONE · ' + code.length + ' B'
    });
    return;
  }

  const remoteJobId = start.data.jobId;
  if (!remoteJobId) {
    writeJob(localId, {
      status: 'error',
      progress: 100,
      stage: 'error',
      error: 'Respuesta sin jobId ni code',
      logLine: 'ERROR respuesta inválida del ofuscador'
    });
    return;
  }

  writeJob(localId, {
    progress: 10,
    stage: 'queued',
    remoteJobId,
    logLine: 'Job remoto ' + remoteJobId + ' · esperando…'
  });

  const t0 = Date.now();
  const maxMs = 25 * 60 * 1000;

  while (Date.now() - t0 < maxMs) {
    await new Promise((r) => setTimeout(r, 1500));

    let poll;
    try {
      poll = await remoteFetch('/job/' + encodeURIComponent(remoteJobId), { timeout: 45000 });
    } catch (e) {
      writeJob(localId, {
        logLine: 'Poll falló (reintento): ' + String(e.message || e).slice(0, 120)
      });
      continue;
    }

    // 502/503 cold start
    if (poll.status === 502 || poll.status === 503 || poll.status === 504) {
      writeJob(localId, {
        progress: Math.min(95, (writeJob(localId, {}).progress || 10) + 1),
        stage: 'remote',
        logLine: 'Ofuscador ocupado/despertando (' + poll.status + ')…'
      });
      continue;
    }

    const pd = poll.data || {};
    const progress = Math.max(1, Math.min(99, Number(pd.progress) || 15));
    const stage = pd.stage || 'running';
    const patch = {
      progress,
      stage,
      elapsedMs: Date.now() - t0,
      logs: Array.isArray(pd.logs) ? pd.logs : undefined
    };
    if (pd.lastLog) patch.logLine = pd.lastLog;
    else if (pd.logs && pd.logs.length) patch.logLine = pd.logs[pd.logs.length - 1];
    writeJob(localId, patch);

    if (pd.status === 'done' && pd.code) {
      const code = withHeader(pd.code);
      writeJob(localId, {
        status: 'done',
        progress: 100,
        stage: 'done',
        code,
        originalSize: pd.originalSize || String(source).length,
        obfuscatedSize: code.length,
        steps: pd.steps || ['QyrexOBF-remote'],
        logLine: 'DONE · ' + code.length + ' B'
      });
      return;
    }

    if (pd.status === 'error' || (pd.success === false && pd.error && pd.status !== 'running')) {
      writeJob(localId, {
        status: 'error',
        progress: 100,
        stage: 'error',
        error: String(pd.error || 'Ofuscación remota falló').slice(0, 500),
        logLine: 'ERROR: ' + String(pd.error || 'fail').slice(0, 200)
      });
      return;
    }

    if (pd.status === 'missing') {
      writeJob(localId, {
        status: 'error',
        progress: 100,
        stage: 'error',
        error: 'Job remoto perdido (¿reinicio del ofuscador?)',
        logLine: 'ERROR job remoto missing'
      });
      return;
    }
  }

  writeJob(localId, {
    status: 'error',
    progress: 100,
    stage: 'error',
    error: 'Timeout 25 min esperando QyrexOBF remoto',
    logLine: 'ERROR timeout remoto'
  });
}

async function startJob(source, opts) {
  const id = crypto.randomBytes(8).toString('hex');
  writeJob(id, {
    id,
    status: 'queued',
    progress: 2,
    stage: 'queued',
    createdAt: Date.now(),
    logLine: 'Job local creado → reenviando a ' + baseUrl()
  });
  setImmediate(() => {
    runRemoteObf(id, source, opts).catch((e) => {
      writeJob(id, {
        status: 'error',
        progress: 100,
        stage: 'error',
        error: String(e.message || e).slice(0, 500),
        logLine: 'ERROR: ' + String(e.message || e).slice(0, 200)
      });
    });
  });
  return id;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function ensureMaxReady() {
  return true;
}

module.exports = {
  startJob,
  getJob,
  withHeader,
  ensureMaxReady,
  baseUrl
};
