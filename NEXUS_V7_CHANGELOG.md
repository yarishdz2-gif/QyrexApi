# Qyrex Nexus v7 — Changelog

## Product layer
- Added Qyrex Nexus v7 utility shell.
- Added command-driven navigation and global search.
- Added developer toolbox with JSON, hash, regex, text, URL, UUID/timestamp and API diagnostics.
- Added local activity history and local snippet storage with bounded item counts.
- Added Focus Mode and a compact floating utility launcher.
- Added safer, non-sensitive support diagnostics.
- Kept the official Qyrex logo URL across the new layer.

## Backend layer
- Added `X-Qyrex-Request-Id` response header.
- Added `Server-Timing` response header generated before response completion.
- Added graceful SIGTERM/SIGINT shutdown handling.
- Existing rate limiting, Helmet and API routing remain intact.

## PWA
- Service Worker version bumped to `qyrex-nexus-v7-1`.
- v7 assets added to the precache shell.

## Validation
- JavaScript syntax checks passed for the backend and v7 runtime.
- Manifest JSON parsed successfully.
- Duplicate HTML `id` check passed for the modified pages.
- Browser visual automation remained environment-limited by the headless Chromium process behavior; no claim of completed visual automation is made.
