/**
 * QyrexObf v4 — fused symbol storm
 * NO XOR · NO Base64 · fast arithmetic · stable anti-tamper · zero false errors
 */
const crypto = require('crypto');
const MAX_SOURCE = 1000000;

// User-requested symbol soup (no " or \ — those break Lua strings)
const SYM = '°!#$%&/()=?¡¨[*]+~^@|{};:,.<>_-¿';
const JUNK = [
  '°skid¡','¡noob°','#dump$','%hook&','/getgc=','?meta¡','¡raw¨',
  '[set]','*isc°','+upv¡','~info#','^ccl$','@chk&','|renv°','_genv¡',
  '¿reg¨','°const¡','¡hook#','#meta$','%raw&','/fire=','?conn¡','¡clone¨'
];

function rb(n){ return crypto.randomBytes(n); }
function ri(n){ return rb(1)[0] % n; }

function rid(pre, len){
  len = len || (8 + ri(6));
  const A = 'IlO0abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = pre || '_';
  const b = rb(len);
  for (let i=0;i<len;i++) s += A[b[i]%A.length];
  // force digits into id
  return s.slice(0,3) + String(10+ri(89)) + s.slice(3) + String(ri(9));
}

function soup(n){
  n = n || (8 + ri(14));
  let s = '';
  const b = rb(n);
  for (let i=0;i<n;i++){
    if (b[i]%5===0) s += String(b[i]%10);
    else s += SYM[b[i]%SYM.length];
  }
  return s;
}

function cmt(){ return `--${JUNK[ri(JUNK.length)]}${soup(6)}${100+ri(899)}`; }

/* ---- fast 4-layer arithmetic (no XOR) ---- */
function encode(data, key){
  const out = Buffer.allocUnsafe(data.length);
  const kl = key.length;
  for (let i=0;i<data.length;i++){
    let b = data[i];
    const k = key[i%kl];
    const p = (i*131+17)&255;
    const q = (i*47+k*3)&255;
    b = (b + k + p) & 255;
    const rot = (k%7)+1;
    b = ((b<<rot)|(b>>>(8-rot)))&255;
    let m = ((k|1)*5)&255; if(!m) m=1;
    b = (b*m + q)&255;
    b = (b - ((p*3+k)&255) + 256)&255;
    out[i]=b;
  }
  return out;
}

function invTable(){
  // precompute modular inverse for every odd multiplier used
  const t = new Array(256);
  for (let kk=0;kk<256;kk++){
    let m = ((kk|1)*5)&255; if(!m) m=1;
    let inv=1;
    for (let x=1;x<256;x++) if (((m*x)&255)===1){ inv=x; break; }
    t[kk]=inv;
  }
  return t;
}

function checksum(buf){
  let h = 0x9e3779b1 >>> 0;
  for (let i=0;i<buf.length;i++){
    h = (h + buf[i]*(i+31) + ((h%89)*17) + 13) >>> 0;
  }
  return h >>> 0;
}

function digitBlob(buf){
  // pure decimal groups — dense digit wall
  let s = '';
  for (let i=0;i<buf.length;i++) s += String(buf[i]).padStart(3,'0');
  return s;
}

function build(encoded, key, sum){
  const N = {
    d: rid('_'), k: rid('_'), f: rid('_'), a: rid('_'),
    s: rid('_'), g: rid('_'), h: rid('_'), i: rid('_'),
    j: rid('_'), t: rid('_'), c: rid('_'), p: rid('_'),
    x: rid('_'), y: rid('_'), z: rid('_')
  };

  const dataDig = digitBlob(encoded);
  const keyDig  = digitBlob(key);

  // split data into many tiny fragments for visual chaos
  const frags = [];
  const fragVars = [];
  let pos = 0;
  while (pos < dataDig.length){
    const sz = 12 + ri(24);
    const v = rid('_f');
    fragVars.push(v);
    frags.push({ v, s: dataDig.slice(pos, pos+sz) });
    pos += sz;
  }

  const L = [];
  L.push(cmt());
  L.push(`--°QyrexObf°v4°${soup(20)}°${sum}`);
  L.push(cmt());
  L.push('do');

  // ---- anti-tamper (conservative, never false-positives on clean Luau) ----
  L.push(`  local ${N.g}=1`);
  L.push(`  if type(pcall)~="function" then ${N.g}=0 end`);
  L.push(`  if type(string)~="table" and type(string)~="userdata" then ${N.g}=0 end`);
  L.push(`  if type(table)~="table" and type(table)~="userdata" then ${N.g}=0 end`);
  // always-true opaque
  // always-true opaque (product forced even)
  const oa = 12 + ri(20)*2; // even
  const ob = 2 + ri(8);
  L.push(`  if ((${oa}*${ob})%2)~=0 then ${N.g}=0 end`);
  L.push(`  if ${N.g}~=1 then return end`);

  // ---- symbol/digit junk storm ----
  for (let i=0;i<8+ri(6);i++){
    const v = rid('_j');
    L.push(`  local ${v}="${JUNK[ri(JUNK.length)]}${soup(10)}${1000+ri(8999)}"`);
    L.push(`  if #${v}<0 then ${v}=${v} end`);
  }

  // ---- payload fragments (digit walls mixed with symbol comments) ----
  for (const f of frags){
    L.push(`  ${cmt()}`);
    L.push(`  local ${f.v}="${f.s}"`);
  }
  L.push(`  local ${N.d}=${fragVars.join('..')}`);
  L.push(`  local ${N.k}="${keyDig}"`);
  L.push(`  local ${N.h}=${sum}`);

  // ---- fast assembler: "065142" → binary ----
  L.push(`  local function ${N.a}(z)`);
  L.push(`    local o={} `);
  L.push(`    for ${N.i}=1,#z,3 do o[#o+1]=string.char(tonumber(string.sub(z,${N.i},${N.i}+2))or 0) end`);
  L.push(`    return table.concat(o)`);
  L.push(`  end`);

  // ---- fast decoder (inverses inline table, no per-byte search) ----
  // Build inverse lookup as Lua table literal for speed
  const inv = invTable();
  const invLit = inv.map((v,i)=>v).join(',');
  L.push(`  local ${N.p}={${invLit}}`);

  L.push(`  local function ${N.f}(data,key)`);
  L.push(`    local o,kl={},#key`);
  L.push(`    for ${N.i}=1,#data do`);
  L.push(`      local b=string.byte(data,${N.i})`);
  L.push(`      local k=string.byte(key,((${N.i}-1)%kl)+1)`);
  L.push(`      local p=((${N.i}-1)*131+17)%256`);
  L.push(`      local q=(((${N.i}-1)*47)+(k*3))%256`);
  L.push(`      b=(b+((p*3+k)%256))%256`);
  L.push(`      local m=((k%2==0 and k+1 or k)*5)%256`);
  L.push(`      if m==0 then m=1 end`);
  L.push(`      b=((b-q+256)*${N.p}[k+1])%256`);
  L.push(`      local rot=(k%7)+1`);
  L.push(`      local hi=math.floor(b/(2^rot)) local lo=b%(2^rot)`);
  L.push(`      b=(lo*(2^(8-rot))+hi)%256`);
  L.push(`      b=(b-k-p+512)%256`);
  L.push(`      o[${N.i}]=string.char(b)`);
  L.push(`    end`);
  L.push(`    return table.concat(o)`);
  L.push(`  end`);

  // ---- more fused noise ----
  L.push(`  ${cmt()}`);
  L.push(`  local ${N.c}=0`);
  L.push(`  for ${N.i}=1,${3+ri(3)} do ${N.c}=${N.c}+${N.i} end`);
  L.push(`  if ${N.c}<0 then return end`);

  // assemble
  L.push(`  local ${N.t}=${N.a}(${N.d})`);
  L.push(`  local ${N.x}=${N.a}(${N.k})`);

  // anti-tamper checksum (pure arithmetic, matches JS)
  L.push(`  do local h=2654435761`);
  L.push(`    for ${N.i}=1,#${N.t} do`);
  L.push(`      local b=string.byte(${N.t},${N.i})`);
  L.push(`      h=(h+b*(${N.i}+30)+((h%89)*17)+13)%4294967296`);
  L.push(`    end`);
  L.push(`    if h~=${N.h} then return end`);
  L.push(`  end`);

  // decode + run
  L.push(`  local ${N.s}=${N.f}(${N.t},${N.x})`);
  L.push(`  local ${N.y},${N.z}=(loadstring or load)(${N.s})`);
  L.push(`  if type(${N.y})=="function" then ${N.y}() end`);
  L.push('end');
  L.push(cmt());

  return L.join('\n');
}

function obfuscate(source, opts){
  opts = opts || {};
  const src = String(source ?? '');
  if (!src.trim()) throw new Error('Empty code');
  if (Buffer.byteLength(src,'utf8') > MAX_SOURCE) throw new Error('Too large');

  if (opts.mode==='none' || (opts.vm===false && opts.plain===true)){
    return { code: src, stats: { inputBytes: Buffer.byteLength(src), outputBytes: Buffer.byteLength(src), mode:'none' } };
  }

  const raw = Buffer.from(src,'utf8');
  const key = rb(28 + ri(12));
  const enc = encode(raw, key);
  const sum = checksum(enc);
  const code = build(enc, key, sum);

  return {
    code,
    stats: {
      inputBytes: raw.length,
      outputBytes: Buffer.byteLength(code,'utf8'),
      mode: 'fused-v4',
      layers: 4,
      encoding: 'arith+digit-wall (no xor/no base64)',
      antiTamper: true
    }
  };
}

module.exports = { obfuscate };
