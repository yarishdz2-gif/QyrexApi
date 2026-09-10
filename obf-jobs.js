'use strict';
/**
 * Solo QyrexOBF MAX (qyrexobf-engine + worker). Sin ofuscador soft viejo.
 * Funciona en Node puro: el pack trae bin/lua5.1 embebido.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const JOB_ROOT = path.join(__dirname, 'obf-jobs');
// Engines del pack en carpeta del proyecto (Node sin Docker)
if (!process.env.QYREX_ENGINES) process.env.QYREX_ENGINES = path.join(__dirname, 'engines');
try { fs.mkdirSync(JOB_ROOT, { recursive: true }); } catch (_) {}

const jobs = new Map();
const children = new Map();

const HEADER = '-- This file was protected using Qyrex Obfuscator v10.3 [https://qyrex.hopto.org]\n';

function withHeader(code) {
  const c = String(code || '');
  if (!c) return c;
  if (c.startsWith('-- This file was protected')) return c;
  return HEADER + c;
}

let maxEngine = null;
function installStaticLua(root) {
  // El lua del pack necesita libreadline (no existe en Render). Sustituimos por binarios solo-libc.
  try {
    const bins = require('./lua-bins');
    const binDir = path.join(root, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const luaPath = path.join(binDir, 'lua5.1');
    const luacPath = path.join(binDir, 'luac5.1');
    fs.writeFileSync(luaPath, Buffer.from(bins.lua5_1, 'base64'));
    fs.writeFileSync(luacPath, Buffer.from(bins.luac5_1, 'base64'));
    fs.chmodSync(luaPath, 0o755);
    fs.chmodSync(luacPath, 0o755);
    // también en /usr/local style paths no — solo pack
    return luaPath;
  } catch (e) {
    console.warn('[QyrexOBF] installStaticLua:', e && e.message);
    return null;
  }
}

function probeLua(bin) {
  try {
    const { execFileSync } = require('child_process');
    execFileSync(bin, ['-v'], { stdio: 'pipe', timeout: 8000 });
    return true;
  } catch (_) {
    return false;
  }
}

try {
  maxEngine = require('./qyrexobf-engine');
  try {
    const root = maxEngine.getRoot();
    // Siempre sobrescribe con lua estático (sin libreadline) — Render Native Node
    console.log('[QyrexOBF] instalando lua5.1 estático (sin readline)…');
    installStaticLua(root);
    let luaBin = path.join(root, 'bin', 'lua5.1');
    // Forzar que findLua vea el bin del pack primero: ya está en la lista
    const found = maxEngine.findLua && maxEngine.findLua();
    console.log('[QyrexOBF] MAX listo · engines=' + root + ' · lua=' + found);
    if (!found || !probeLua(found)) {
      console.error('[QyrexOBF] lua sigue sin ejecutar');
    }
  } catch (e) {
    console.warn('[QyrexOBF] extract:', e && e.message);
  }
} catch (e) {
  console.error('[QyrexOBF] No se pudo cargar qyrexobf-engine:', e && e.message);
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
  const root = maxEngine.getRoot();
  installStaticLua(root);
  let luaBin = path.join(root, 'bin', 'lua5.1');
  const lua = maxEngine.findLua && maxEngine.findLua();
  if (!lua || !probeLua(lua)) {
    // último intento: usar bin del pack tras install
    const forced = path.join(root, 'bin', 'lua5.1');
    if (probeLua(forced)) return true;
    throw new Error('lua5.1 no ejecutable en este host (¿arch no x64?). Contacta soporte Qyrex.');
  }
  return true;
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
