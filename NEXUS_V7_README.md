# Qyrex Nexus v7 — Ultra Mega Pro

v7 adds a utility-first developer workspace layer on top of the existing Qyrex application without replacing the existing router, API contracts, obfuscator, loader or QyrexAI engine.

## New

- Global Search (`/`)
- Developer Toolbox (`Ctrl/Cmd + Shift + X`)
- JSON Lab
- SHA-256 Hash Lab (Web Crypto)
- Regex Lab
- Text Lab
- URL Lab
- UUID + Timestamp generator
- Same-origin GET/HEAD API Probe
- Local Recent Activity
- Local Snippets Vault (30 items)
- Focus Mode
- Support diagnostics that intentionally exclude local/session storage and credentials
- Qyrex logo applied to the new utility layer
- Versioned Service Worker shell entries
- Backend request ID and response timing headers
- Graceful SIGTERM/SIGINT shutdown for Render-style environments

## Safety boundaries

The Toolbox keeps its data local unless a user explicitly calls an API Probe endpoint. The API Probe is restricted to same-origin relative paths and GET/HEAD methods. No tokens or credentials are read from browser storage by the new diagnostics layer.
