-- QyrexApi Anti-Dump v3 Loader
-- IMPORTANT: use HTTPS in production.
-- This loader targets Luau environments that expose `request` and a `crypt` API.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local API = "https://YOUR-DOMAIN.example.com"
local SCRIPT_ID = "demo"
local KEY = "PUT-USER-KEY-HERE"

local HttpRequest = request or http_request or (syn and syn.request)
local Crypt = crypt

local function decoy()
    print("skidder noob")
    return false
end

if type(HttpRequest) ~= "function" then
    return decoy()
end

if type(Crypt) ~= "table" then
    return decoy()
end

-- Runtime hardening heuristics. These are intentionally conservative:
-- the presence of one executor API alone is not enough to abort.
local function suspiciousEnvironment()
    local score = 0

    local probes = {
        "hookfunction",
        "hookmetamethod",
        "getrawmetatable",
        "getconnections",
        "getgc",
        "getreg",
        "getupvalues",
        "getconstant",
        "getconstants",
        "setreadonly",
        "iscclosure",
    }

    local g = getfenv and getfenv(0) or _G
    for _, name in ipairs(probes) do
        if type(g[name]) == "function" then
            score += 1
        end
    end

    -- The loader itself must have a callable loadstring/load function.
    local loader = loadstring or load
    if type(loader) ~= "function" then
        return true
    end

    -- A light integrity canary. Do not rely on this as a complete hook detector.
    local ok, result = pcall(function()
        local fn = function(x) return x + 7 end
        local a = fn(5)
        return a == 12
    end)
    if not ok or result ~= true then
        score += 3
    end

    -- Multiple inspection primitives at once are a stronger signal.
    return score >= 4
end

if suspiciousEnvironment() then
    return decoy()
end

local function b64decode(s)
    if type(Crypt.base64decode) == "function" then
        return Crypt.base64decode(s)
    end
    if type(Crypt.base64) == "table" and type(Crypt.base64.decode) == "function" then
        return Crypt.base64.decode(s)
    end
    error("QyrexApi: base64 decoder missing")
end

local function sha256hex(data)
    if type(Crypt.hash) == "function" then
        local ok, out = pcall(Crypt.hash, "sha256", data)
        if ok and type(out) == "string" then
            return out:gsub("%s+", ""):lower()
        end
    end
    if type(Crypt.hash) == "table" and type(Crypt.hash.sha256) == "function" then
        local ok, out = pcall(Crypt.hash.sha256, data)
        if ok and type(out) == "string" then
            return out:gsub("%s+", ""):lower()
        end
    end
    error("QyrexApi: sha256 is unavailable in this environment")
end

local function requireEq(a, b)
    if type(a) ~= "string" or type(b) ~= "string" then
        return false
    end
    return a:lower() == b:lower()
end

-- AES-256-GCM compatibility adapter.
-- Supported shapes:
--   crypt.decrypt(ciphertext, key, iv, "aes-gcm", tag)
--   crypt.decrypt(ciphertext, key, iv, tag, "aes-256-gcm")
--   crypt.aes_gcm_decrypt(ciphertext, key, iv, tag, aad)
local function aesGcmDecrypt(ciphertext, key, iv, tag, aad)
    if type(Crypt.aes_gcm_decrypt) == "function" then
        local ok, out = pcall(Crypt.aes_gcm_decrypt, ciphertext, key, iv, tag, aad)
        if ok and type(out) == "string" then return out end
    end

    if type(Crypt.decrypt) == "function" then
        local attempts = {
            function() return Crypt.decrypt(ciphertext, key, iv, "aes-gcm", tag, aad) end,
            function() return Crypt.decrypt(ciphertext, key, iv, tag, "aes-256-gcm", aad) end,
            function() return Crypt.decrypt(ciphertext, key, iv, "AES-256-GCM", tag, aad) end,
        }
        for _, attempt in ipairs(attempts) do
            local ok, out = pcall(attempt)
            if ok and type(out) == "string" then return out end
        end
    end

    error("QyrexApi: AES-256-GCM is unavailable or has an incompatible API")
end

local function xorBytes(data, key)
    local out = table.create(#data)
    local klen = #key
    for i = 1, #data do
        local a = string.byte(data, i)
        local b = string.byte(key, ((i - 1) % klen) + 1)
        out[i] = string.char(bit32.bxor(a, b))
    end
    return table.concat(out)
end

local function deriveChunkKey(sessionKey, salt)
    -- Preferred: HKDF-SHA256 in newer crypt providers.
    if type(Crypt.hkdf) == "function" then
        local ok, out = pcall(Crypt.hkdf, "sha256", sessionKey, salt, "QyrexApi/A-D/v3/chunk", 32)
        if ok and type(out) == "string" then return out end
    end

    -- Fallback for environments exposing only HMAC/SHA-256.
    if type(Crypt.hmac) == "function" then
        local ok, out = pcall(Crypt.hmac, "sha256", sessionKey, salt .. "QyrexApi/A-D/v3/chunk")
        if ok and type(out) == "string" then
            if #out >= 32 then return out:sub(1, 32) end
        end
    end

    error("QyrexApi: HKDF/HMAC support is unavailable")
end

local function maskKey(sessionKey, salt)
    local digest = sha256hex(sessionKey .. salt)
    -- If hash returns hex, convert it to bytes for XOR.
    local bytes = {}
    for i = 1, #digest, 2 do
        bytes[#bytes + 1] = string.char(tonumber(digest:sub(i, i + 1), 16))
    end
    return table.concat(bytes)
end

local function httpJson(url, body)
    local ok, response = pcall(HttpRequest, {
        Url = url,
        Method = "POST",
        Headers = {
            ["Content-Type"] = "application/json",
            ["Cache-Control"] = "no-store",
            ["X-Requested-With"] = "QyrexApi-Luau",
        },
        Body = game:GetService("HttpService"):JSONEncode(body),
    })
    if not ok or type(response) ~= "table" or type(response.Body) ~= "string" then
        return nil
    end
    if response.StatusCode and response.StatusCode ~= 200 then
        return nil
    end
    local okDecode, decoded = pcall(function()
        return game:GetService("HttpService"):JSONDecode(response.Body)
    end)
    if not okDecode or type(decoded) ~= "table" then
        return nil
    end
    return decoded
end

local function runProtected()
    local handshake = httpJson(API .. "/api/v3/handshake", {
        scriptId = SCRIPT_ID,
        key = KEY,
    })
    if not handshake then
        return decoy()
    end

    local sessionId = handshake.sessionId
    local sessionKeyB64 = handshake.sessionKey
    local challenge = handshake.firstChallenge
    local total = tonumber(handshake.total)

    if type(sessionId) ~= "string" or type(sessionKeyB64) ~= "string" or type(challenge) ~= "string" or type(total) ~= "number" then
        return decoy()
    end

    local sessionKey = b64decode(sessionKeyB64)
    local realParts = table.create(total)
    local received = 0

    for _ = 1, total + 2 do
        if received >= total then break end
        if suspiciousEnvironment() then return decoy() end

        local packet = httpJson(API .. "/api/v3/chunk", {
            sessionId = sessionId,
            challenge = challenge,
        })
        if not packet then
            return decoy()
        end

        if packet.done then
            break
        end

        local cursor = tonumber(packet.cursor)
        local packetType = packet.type
        local packetIndex = tonumber(packet.index)
        if cursor == nil or (packetType ~= "real" and packetType ~= "decoy") then
            return decoy()
        end
        if type(packet.ciphertext) ~= "string" or type(packet.sha256) ~= "string" then
            return decoy()
        end

        local encodedCipher = packet.ciphertext
        if type(packet.ciphertextSha256) ~= "string" or not requireEq(sha256hex(b64decode(encodedCipher)), packet.ciphertextSha256) then
            return decoy()
        end

        local salt = b64decode(packet.salt)
        local iv = b64decode(packet.iv)
        local tag = b64decode(packet.tag)
        local aad = b64decode(packet.aad)
        local maskedCipher = b64decode(packet.ciphertext)

        local mask = maskKey(sessionKey, salt)
        local ciphertext = xorBytes(maskedCipher, mask)
        local key = deriveChunkKey(sessionKey, salt)
        local plaintext
        local okDecrypt, result = pcall(function()
            return aesGcmDecrypt(ciphertext, key, iv, tag, aad)
        end)
        if not okDecrypt or type(result) ~= "string" then
            return decoy()
        end

        if not requireEq(sha256hex(result), packet.sha256) then
            return decoy()
        end

        if packetType == "real" and packetIndex and packetIndex >= 0 then
            realParts[packetIndex + 1] = result
        end

        received += 1
        challenge = packet.challenge
    end

    local assembled = {}
    local expectedReal = tonumber(handshake.realCount)
    if not expectedReal or expectedReal < 1 then
        return decoy()
    end
    for i = 1, expectedReal do
        local piece = realParts[i]
        if type(piece) ~= "string" then
            return decoy()
        end
        assembled[#assembled + 1] = piece
    end

    local finalSource = table.concat(assembled)
    if type(handshake.sourceSha256) ~= "string" or not requireEq(sha256hex(finalSource), handshake.sourceSha256) then
        return decoy()
    end

    local loadFn = loadstring or load
    if type(loadFn) ~= "function" then
        return decoy()
    end

    local fn
    local okLoad, loadResult = pcall(function()
        return loadFn(finalSource, "QyrexProtected")
    end)
    if not okLoad or type(loadResult) ~= "function" then
        return decoy()
    end
    fn = loadResult

    -- Run in a constrained environment where the Luau implementation allows it.
    if type(setfenv) == "function" then
        local safeEnv = {
            game = game,
            workspace = workspace,
            Players = Players,
            print = print,
            warn = warn,
            pairs = pairs,
            ipairs = ipairs,
            next = next,
            type = type,
            tostring = tostring,
            tonumber = tonumber,
            string = string,
            table = table,
            math = math,
            coroutine = coroutine,
            task = task,
        }
        setfenv(fn, setmetatable(safeEnv, { __index = _G }))
    end

    local okRun = pcall(fn)
    if not okRun then
        return decoy()
    end
    return true
end

return runProtected()
