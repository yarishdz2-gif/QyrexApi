# Qyrex Nexus APEX v5 — Ultra Pro

## Added utilities
- Workspace Center (`Ctrl+Shift+W`)
- Global Search (`Ctrl+Shift+F`)
- Local create-script draft autosave and restore
- Clipboard history for the last 10 copied values
- Safe preference backup/restore (no auth tokens exported)
- Safe technical diagnostics export/copy
- UI cache cleanup that preserves authentication and script favorites
- PWA shell + service worker with API endpoints excluded from cache
- QyrexAI Prompt Library, current-chat statistics and Markdown export
- QyrexAI shortcuts: `Ctrl+Shift+P` prompts, `Ctrl+Shift+E` Markdown
- Mobile/PWA metadata and updated Qyrex logo
- Provider form duplicate-field correction

## Compatibility
The backend API contracts and existing server routes were left unchanged. The new utilities are progressive enhancements and fail safely when an optional browser capability is unavailable.
