# Qyrex Nexus APEX v6 — Ultra Mega Pro

## Productivity layer
- Developer Toolbox local con 9 módulos: Overview, JSON, API Probe, Text, URL, Regex, Time/UUID, Snippets y System.
- Barra contextual de herramientas en el panel principal.
- Same-origin API Probe con latencia y timeout de 9 segundos.
- JSON formatter / minifier / validator.
- Text Lab con caracteres, palabras, líneas y bytes UTF-8.
- URL encode/decode.
- Regex tester local.
- Unix timestamp converter + UUID generator.
- Local Snippets Vault (hasta 30 snippets, almacenados solo en localStorage).
- Diagnóstico de soporte sin tokens, cookies ni contenido de scripts.
- Métricas de runtime y almacenamiento del navegador.
- Atajos: Ctrl+Shift+X, Esc y 1–9 dentro de Toolbox.

## QyrexAI
- Barra de productividad v6.
- Stats de sesión, copiar última respuesta, exportar Markdown y compactar prompts.
- No reemplaza el motor de chat ni sus rutas existentes.

## PWA
- Service Worker actualizado para cachear la nueva capa v6.
- No cachea rutas `/api/*`.

## Compatibility
- No se modifican los contratos de la API existentes.
- Todas las utilidades nuevas son progresivas y fallan de forma segura si una API del navegador no está disponible.
