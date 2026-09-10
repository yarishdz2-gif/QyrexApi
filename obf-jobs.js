'use strict';
/**
 * Async QyrexOBF jobs for create-script loading UI
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const JOB_ROOT = path.join(__dirname, 'obf-jobs');
try { fs.mkdirSync(JOB_ROOT, { recursive: true }); } catch (_) {}

const jobs = new Map();
const children = new Map();

let maxEngine = null;
try {
  maxEngine = require('./qyrexobf-engine');
  console.log('[QyrexOBF] motor MAX cargado');
} catch (e) {
  console.warn('[QyrexOBF] motor MAX no disponible:', e && e.message);
}

const { obfuscate: softObfuscate } = require('./obfuscate');

function metaPath(id) { return path.join(JOB_ROOT, id, 'meta.json'); }
function readMeta(id) {
  try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')); } catch (_) { return null; }
}
function writeMeta(id, patch) {
  const dir = path.join(JOB_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  const cur = readMeta(id) || { id, logs: [], createdAt: Date.now() };
  const logs = Array.isArray(cur.logs) ? cur.logs.slice(-60) : [];
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

const HEADER = '-- This file was protected using Qyrex Obfuscator v10.3 [https://qyrex.hopto.org]\n';

function withHeader(code) {
  const c = String(code || '');
  if (!c) return c;
  if (c.startsWith('-- This file was protected')) return c;
  return HEADER + c;
}

async function runSoft(id, source) {
  writeMeta(id, { status: 'running', progress: 8, stage: 'boot', logLine: 'Qyrex engine…' });
  await new Promise((r) => setTimeout(r, 180));
  writeMeta(id, { progress: 22, stage: 'protect', logLine: 'Protecciones…' });
  await new Promise((r) => setTimeout(r, 120));
  writeMeta(id, { progress: 48, stage: 'encode', logLine: 'Ofuscando payload…' });
  const result = softObfuscate(String(source || ''));
  let code = result && result.code ? result.code : String(result || '');
  if (!code.trim()) throw new Error('Ofuscador vacío');
  writeMeta(id, { progress: 88, stage: 'finalize', logLine: 'Finalizando…' });
  await new Promise((r) => setTimeout(r, 80));
  code = withHeader(code);
  writeMeta(id, {
    status: 'done',
    progress: 100,
    stage: 'done',
    code,
    originalSize: String(source).length,
    obfuscatedSize: code.length,
    steps: ['QyrexSoft'],
    logLine: 'DONE · ' + code.length + ' B'
  });
  return code;
}

function startMaxWorker(id, source, opts) {
  const dir = path.join(JOB_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'in.lua'), source, 'utf8');
  writeMeta(id, {
    id,
    status: 'running',
    progress: 5,
    stage: 'spawn',
    createdAt: Date.now(),
    opts: opts || { antiTamper: true },
    logLine: 'Worker MAX arrancando…'
  });
  const workerJs = path.join(__dirname, 'qyrexobf-worker.js');
  const child = spawn(process.execPath, [workerJs, dir], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  children.set(id, child);
  const beat = setInterval(() => {
    const m = readMeta(id);
    if (!m || m.status === 'done' || m.status === 'error') {
      clearInterval(beat);
      return;
    }
    let p = Number(m.progress) || 5;
    if (p < 97) p = Math.min(97, p + (p < 88 ? 1 : 0.3));
    writeMeta(id, {
      progress: Math.round(p * 10) / 10,
      elapsedMs: Date.now() - (m.createdAt || Date.now())
    });
  }, 2000);
  child.stderr.on('data', (b) => {
    const line = String(b).trim().slice(0, 200);
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
          obfuscatedSize: out.length,
          logLine: 'DONE MAX · ' + out.length + ' B'
        });
      } catch (_) {
        writeMeta(id, {
          status: 'error',
          progress: 100,
          stage: 'error',
          error: 'Sin out.lua',
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
  const wantMax = !(opts && opts.max === false);
  const workerOk = fs.existsSync(path.join(__dirname, 'qyrexobf-worker.js'));
  let useMax = false;
  if (wantMax && maxEngine && workerOk) {
    try {
      if (typeof maxEngine.findLua === 'function' && !maxEngine.findLua()) {
        throw new Error('lua5.1 no disponible');
      }
      useMax = true;
    } catch (e) {
      console.warn('[QyrexOBF] MAX no usable, soft:', e.message);
    }
  }
  if (useMax) {
    startMaxWorker(id, source, opts);
    return id;
  }
  writeMeta(id, {
    id,
    status: 'queued',
    progress: 2,
    stage: 'queued',
    createdAt: Date.now(),
    logLine: 'Job en cola'
  });
  setImmediate(() => {
    runSoft(id, source).catch((e) => {
      writeMeta(id, {
        status: 'error',
        progress: 100,
        stage: 'error',
        error: String(e.message || e).slice(0, 500),
        logLine: 'ERROR: ' + (e.message || e)
      });
    });
  });
  return id;
}

function getJob(id) {
  return readMeta(id) || jobs.get(id) || null;
}

module.exports = { startJob, getJob, withHeader };
