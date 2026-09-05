/**
 * QyrexObf v3 — MAXIMUM density packer
 * NO XOR · NO Base64 · pure arithmetic + digit/symbol flood + anti-tamper
 *
 * - Source never rewritten (stable reconstruct → loadstring/load)
 * - 5 arithmetic layers (add / rot / mul / sub / permute)
 * - Payload emitted as mixed digit tables + symbol noise
 * - Runtime anti-tamper: checksum, length gate, opaque predicates, env probes
 */

const crypto = require('crypto');

const MAX_SOURCE = 1000000;
const SYM = '!#$%&/()=?¡¿*+~^@|{}[];:,.<>_-';
const DIGITS = '0123456789';

const JUNK = [
  '¡¿skid?!', 'noob#$%&', 'dump&()=¡', 'hook¡¿!@#', 'getgc!@#$%',
  'metamethod¿¡', 'rawget#$%&/', 'setreadonly&()=', 'iscclosure¡¿!',
  'getupvalue!@#%', 'debug.getinfo¿¡', 'newcclosure#$%', 'checkcaller&()',
  'getrenv¡¿!@', 'getgenv!@#$', 'getreg¿¡#$', 'getconstants#$%&',
  'hookfunction&()=', 'hookmetamethod¡¿', 'getrawmetatable!@#',
  'firesignal¿¡#$', 'getconnections#$%', 'cloneref&()=¡', 'compareinstances¡¿',
  'decompile!@#$%', 'getscriptbytecode¿¡', 'dumpstring#$%&/', 'getnamecallmethod&()'
];

function rb(n) { return crypto.randomBytes(n); }
function ri(max) { return rb(1)[0] % max; }

function randomId(prefix, len) {
  len = len || (10 + ri(8));
  const alphabet = 'Il1O0abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ_';
  let out = prefix || '_';
  const bytes = rb(len);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  // Force digits into the name for density
  const dpos = 2 + ri(Math.max(1, out.length - 3));
  out = out.slice(0, dpos) + String(10 + ri(89)) + out.slice(dpos);
  return out;
}

function symStr(min, max) {
  min = min || 6; max = max || 22;
  const len = min + ri(max - min + 1);
  let s = '';
  const bytes = rb(len);
  for (let i = 0; i < len; i++) {
    // mix symbols + digits heavily
    if (bytes[i] % 3 === 0) s += DIGITS[bytes[i] % 10];
    else s += SYM[bytes[i] % SYM.length];
  }
  return s;
}

function junkComment() {
  return `-- ${JUNK[ri(JUNK.length)]} ${symStr(5, 14)} ${10 + ri(8900)}`;
}

function opaqueTrue() {
  const a = 11 + ri(40);
  const b = 2 + ri(9);
  const variants = [
    `((${a}*${b})%2)==${(a * b) % 2}`,
    `(${a}+${b})~=${a - b - 1}`,
    `type(${a})=="number"`,
    `#("${symStr(4, 7)}")>${2 + ri(3)}`,
    `select(2,pcall(function()return ${a}/${Math.max(1, b)}end))==nil or true`,
    `(${a}*${a})>=${a}`,
    `tonumber("${10 + ri(80)}")~=nil`
  ];
  return variants[ri(variants.length)];
}

/* ---------- 5-layer arithmetic codec (no XOR) ---------- */

function encodeBuffer(data, key) {
  const out = Buffer.allocUnsafe(data.length);
  const klen = key.length;
  for (let i = 0; i < data.length; i++) {
    let b = data[i];
    const k = key[i % klen];
    const p = (i * 131 + 17) & 0xff;
    const q = ((i * 47) + (k * 3)) & 0xff;
    const r = ((i * 19) + (k * 7) + 53) & 0xff;

    // L1 add
    b = (b + k + p) & 0xff;
    // L2 rotate left
    const rot = (k % 7) + 1;
    b = ((b << rot) | (b >>> (8 - rot))) & 0xff;
    // L3 mul + add (odd mul → invertible mod 256)
    let mul = ((k | 1) * 3) & 0xff;
    if (mul === 0) mul = 1;
    b = (b * mul + q) & 0xff;
    // L4 sub
    b = (b - ((p * 5 + k) & 0xff) + 256) & 0xff;
    // L5 permute/add secondary
    b = (b + r + ((k * p) & 0xff)) & 0xff;

    out[i] = b;
  }
  return out;
}

function checksum32(buf) {
  // pure arithmetic rolling checksum (no XOR) — anti-tamper only
  let h = 2166136261 % 4294967296;
  for (let i = 0; i < buf.length; i++) {
    h = (h + buf[i] * (i + 17) + ((h % 97) * 13)) % 4294967296;
    h = (h * 16777619 + 101) % 4294967296;
  }
  return h;
}

function buildDecodeLua(n) {
  return [
    `local function ${n.dec}(data,key)`,
    `  local out,klen={},#key`,
    `  local invt={}`,
    `  for ${n.j}=0,255 do`,
    `    local kk=${n.j}`,
    `    local mul=((kk%2==0 and kk+1 or kk)*3)%256`,
    `    if mul==0 then mul=1 end`,
    `    local inv=1`,
    `    for t=1,255 do if (mul*t)%256==1 then inv=t break end end`,
    `    invt[${n.j}+1]=inv`,
    `  end`,
    `  for ${n.i}=1,#data do`,
    `    local b=string.byte(data,${n.i})`,
    `    local k=string.byte(key,((${n.i}-1)%klen)+1)`,
    `    local p=((${n.i}-1)*131+17)%256`,
    `    local q=(((${n.i}-1)*47)+(k*3))%256`,
    `    local r=(((${n.i}-1)*19)+(k*7)+53)%256`,
    `    b=(b-r-((k*p)%256)+512)%256`,
    `    b=(b+((p*5+k)%256))%256`,
    `    local inv=invt[k+1]`,
    `    b=((b-q+256)*inv)%256`,
    `    local rot=(k%7)+1`,
    `    local hi=math.floor(b/(2^rot))`,
    `    local lo=b%(2^rot)`,
    `    b=(lo*(2^(8-rot))+hi)%256`,
    `    b=(b-k-p+512)%256`,
    `    out[${n.i}]=string.char(b)`,
    `  end`,
    `  return table.concat(out)`,
    `end`
  ].join('\n');
}

function emitPayloadAsDigitBlob(buf, n) {
  // Represent as long string of decimal digits groups: "065|142|003|..."
  // Plus interleaved symbol comments and fake locals.
  const groups = [];
  for (let i = 0; i < buf.length; i++) {
    groups.push(String(buf[i]).padStart(3, '0'));
  }
  // Split into many small string fragments
  const fragSize = 24 + ri(20);
  const frags = [];
  for (let i = 0; i < groups.length; i += fragSize) {
    frags.push(groups.slice(i, i + fragSize).join(''));
  }

  const lines = [];
  const fragVars = [];
  frags.forEach((f, i) => {
    const v = randomId(`_d${i}_`);
    fragVars.push(v);
    // wrap with symbol noise in comments
    lines.push(`  ${junkComment()}`);
    lines.push(`  local ${v}="${f}" -- ${symStr(4, 10)}`);
  });
  lines.push(`  local ${n.bytes}=${fragVars.join('..')}`);
  return lines;
}

function buildDigitAssembler(n) {
  // Convert digit string "065142003..." back to binary string
  return [
    `local function ${n.asm}(ds)`,
    `  local out={} `,
    `  for ${n.i}=1,#ds,3 do`,
    `    local n=tonumber(string.sub(ds,${n.i},${n.i}+2)) or 0`,
    `    out[#out+1]=string.char(n)`,
    `  end`,
    `  return table.concat(out)`,
    `end`
  ].join('\n');
}

function buildWrapper(encoded, key, sum) {
  const n = {
    bytes: randomId('_q'),
    key: randomId('_k'),
    dec: randomId('_d'),
    asm: randomId('_a'),
    src: randomId('_s'),
    fn: randomId('_f'),
    err: randomId('_e'),
    i: randomId('_i'),
    j: randomId('_j'),
    gate: randomId('_g'),
    conf: randomId('_c'),
    sum: randomId('_h'),
    tmp: randomId('_t'),
    env: randomId('_v')
  };

  // key also as digit blob
  const keyGroups = [...key].map(b => String(b).padStart(3, '0')).join('');

  const lines = [];
  lines.push(junkComment());
  lines.push(`-- QyrexObf v3 · ${symStr(18, 28)} · ${sum}`);
  lines.push(junkComment());
  lines.push('do');
  lines.push(`  ${junkComment()}`);

  // --- anti-tamper gate ---
  lines.push(`  local ${n.gate}=true`);
  lines.push(`  if not (${opaqueTrue()}) then ${n.gate}=false end`);
  lines.push(`  if not (${opaqueTrue()}) then ${n.gate}=false end`);
  // length sanity
  lines.push(`  local ${n.env}=0`);
  lines.push(`  if type(string)~="table" and type(string)~="userdata" then ${n.env}=${n.env}+1 end`);
  lines.push(`  if type(table)~="table" and type(table)~="userdata" then ${n.env}=${n.env}+1 end`);
  lines.push(`  if type(pcall)~="function" then ${n.env}=${n.env}+3 end`);
  lines.push(`  if type(loadstring)~="function" and type(load)~="function" then ${n.env}=${n.env}+5 end`);
  lines.push(`  if ${n.env}>4 then ${n.gate}=false end`);
  lines.push(`  if not ${n.gate} then error("${symStr(8, 16)}",0) end`);

  // junk locals flooded with digits + symbols
  for (let k = 0; k < 6 + ri(5); k++) {
    const jv = randomId('_j');
    const val = `${JUNK[ri(JUNK.length)]}${symStr(4, 12)}${1000 + ri(8999)}`;
    lines.push(`  local ${jv}="${val}"`);
    lines.push(`  if #${jv}<0 then ${jv}=${jv}.."${symStr(2, 5)}" end`);
  }

  // payload as digit fragments
  const payloadLines = emitPayloadAsDigitBlob(encoded, n);
  lines.push(...payloadLines);

  // key as digit string
  lines.push(`  local ${n.key}="${keyGroups}" -- ${symStr(6, 12)}`);
  lines.push(`  local ${n.sum}=${sum}`);

  // assembler + decoder
  lines.push(buildDigitAssembler(n).split('\n').map(l => '  ' + l).join('\n'));
  lines.push(buildDecodeLua(n).split('\n').map(l => '  ' + l).join('\n'));

  // more noise loop
  lines.push(`  ${junkComment()}`);
  lines.push(`  local ${n.conf}=0`);
  lines.push(`  for ${n.i}=1,${4 + ri(4)} do ${n.conf}=${n.conf}+((${n.i}*${13 + ri(17)})%9) end`);
  lines.push(`  if ${n.conf}<0 then return end`);

  // assemble binary from digit strings
  lines.push(`  local ${n.tmp}=${n.asm}(${n.bytes})`);
  lines.push(`  local ${n.key}_b=${n.asm}(${n.key})`);

  // lightweight checksum anti-tamper over reconstructed bytes
  lines.push(`  do`);
  lines.push(`    local h=2166136261`);
  lines.push(`    for ${n.i}=1,#${n.tmp} do`);
  lines.push(`      local b=string.byte(${n.tmp},${n.i})`);
  lines.push(`      h=(h+b*(${n.i}+16)+((h%97)*13))%4294967296`);
  lines.push(`      h=(h*16777619+101)%4294967296`);
  lines.push(`    end`);
  lines.push(`    if h~=${n.sum} then error("${symStr(6, 12)}",0) end`);
  lines.push(`  end`);

  // decode
  lines.push(`  local ${n.src}=${n.dec}(${n.tmp},${n.key}_b)`);
  lines.push(`  local ${n.fn},${n.err}=(loadstring or load)(${n.src})`);
  lines.push(`  if type(${n.fn})~="function" then error(${n.err} or "Qyrex ${symStr(5, 9)}",0) end`);

  // final opaque + execute
  lines.push(`  if (${opaqueTrue()}) and ${n.gate} then`);
  lines.push(`    ${n.fn}()`);
  lines.push(`  else`);
  lines.push(`    error("${symStr(10, 18)}",0)`);
  lines.push(`  end`);
  lines.push('end');
  lines.push(junkComment());

  return lines.join('\n');
}

function obfuscate(source, opts) {
  opts = opts || {};
  const src = String(source ?? '');
  if (!src.trim()) throw new Error('Empty code');
  if (Buffer.byteLength(src, 'utf8') > MAX_SOURCE) throw new Error('Too large');

  if (opts.mode === 'none' || (opts.vm === false && opts.plain === true)) {
    return {
      code: src,
      stats: { inputBytes: Buffer.byteLength(src), outputBytes: Buffer.byteLength(src), mode: 'none' }
    };
  }

  const raw = Buffer.from(src, 'utf8');
  const key = rb(36 + ri(20));
  const encoded = encodeBuffer(raw, key);
  const sum = checksum32(encoded);
  const code = buildWrapper(encoded, key, sum);

  return {
    code,
    stats: {
      inputBytes: raw.length,
      outputBytes: Buffer.byteLength(code, 'utf8'),
      mode: 'arith-packed-v3',
      layers: 5,
      encoding: 'add-rot-mul-sub-perm + digit-blob (no xor / no base64)',
      antiTamper: true
    }
  };
}

module.exports = { obfuscate };
