/**
 * QyrexObf - stability-first Lua/Luau packer
 *
 * Important design goal: never rewrite the user's Lua syntax.
 * The original source is stored as XOR-encoded bytes and reconstructed
 * inside a small, fixed Luau wrapper. This avoids parser/renaming/VM bugs
 * caused by token transforms while still hiding the plain source at rest.
 */
const crypto = require('crypto');

const MAX_SOURCE = 1000000;

function randomId(prefix) {
  const alphabet = 'IlOo01abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = prefix;
  for (let i = 0; i < 10; i++) {
    out += alphabet[crypto.randomBytes(1)[0] % alphabet.length];
  }
  return out;
}

function luaBinaryString(buf) {
  let out = '"';
  for (const b of buf) {
    // Keep printable ASCII readable except Lua string syntax characters.
    if (b >= 32 && b <= 126 && b !== 34 && b !== 92) {
      out += String.fromCharCode(b);
    } else {
      // Always use exactly 3 decimal digits so a following digit cannot be
      // swallowed by the escape sequence.
      out += '\\' + String(b).padStart(3, '0');
    }
  }
  return out + '"';
}

function xorBuffer(data, key) {
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length] ^ ((i * 73 + 41) & 0xff);
  }
  return out;
}

function buildWrapper(encoded, key) {
  const n = {
    bytes: randomId('__q'),
    key: randomId('__k'),
    decode: randomId('__d'),
    bxor: randomId('__x'),
    src: randomId('__s'),
    fn: randomId('__f'),
    err: randomId('__e'),
    i: randomId('__i'),
    j: randomId('__j'),
    out: randomId('__o'),
    part: randomId('__p')
  };

  const keyLua = luaBinaryString(key);
  const encodedLua = luaBinaryString(encoded);

  return [
    '-- QyrexObf stable packer',
    'do',
    '  local ' + n.bxor + ' = (bit32 and bit32.bxor) or function(a,b)',
    '    local o,p,x,y=0,1,a,b',
    '    for ' + n.i + '=1,8 do',
    '      local ' + n.j + ',z=x%2,y%2',
    '      if ' + n.j + ' ~= z then o=o+p end',
    '      x=(x-' + n.j + ')/2',
    '      y=(y-z)/2',
    '      p=p*2',
    '    end',
    '    return o',
    '  end',
    '  local ' + n.key + '=' + keyLua,
    '  local ' + n.bytes + '=' + encodedLua,
    '  local ' + n.out + '={}',
    '  local ' + n.part + '={}',
    '  for ' + n.i + '=1,#' + n.bytes + ' do',
    '    local b=string.byte(' + n.bytes + ',' + n.i + ')',
    '    local k=string.byte(' + n.key + ',((' + n.i + '-1)%#' + n.key + ')+1)',
    '    local s=(' + n.i + '-1)*73+41',
    '    s=s%256',
    '    ' + n.out + '[' + n.i + ']=' + n.bxor + '(' + n.bxor + '(b,k),s)',
    '    if ' + n.i + '%256==0 then',
    '      ' + n.part + '[#' + n.part + '+1]=string.char(table.unpack(' + n.out + ', ' + n.i + '-255, ' + n.i + '))',
    '    end',
    '  end',
    '  local r=#' + n.bytes + '%256',
    '  if r~=0 then',
    '    local a=#' + n.bytes + '-r+1',
    '    ' + n.part + '[#' + n.part + '+1]=string.char(table.unpack(' + n.out + ',a,#' + n.out + '))',
    '  end',
    '  local ' + n.src + '=table.concat(' + n.part + ')',
    '  local ' + n.fn + ',' + n.err + '=(loadstring or load)(' + n.src + ')',
    '  if type(' + n.fn + ')~="function" then error(' + n.err + ' or "Qyrex compile failed",0) end',
    '  ' + n.fn + '()',
    'end'
  ].join('\n');
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
  const key = crypto.randomBytes(24);
  const encoded = xorBuffer(raw, key);
  const code = buildWrapper(encoded, key);

  return {
    code,
    stats: {
      inputBytes: raw.length,
      outputBytes: Buffer.byteLength(code, 'utf8'),
      mode: 'stable-packed'
    }
  };
}

module.exports = { obfuscate };
