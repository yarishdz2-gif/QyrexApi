# Qyrex Ultra — UI/UX + Reliability update

- Nuevo sistema visual dark-tech negro + azul cielo con superficies, estados y jerarquía tipográfica unificados.
- Paleta de comandos con `Ctrl/Cmd + K`, navegación rápida y filtrado por sección.
- Barra de progreso de navegación y transición de páginas.
- Indicador real de salud de `/api/health` con estado de base de datos cuando está disponible.
- Mejoras de teclado, foco visible, reducción de movimiento y comportamiento responsive.
- Mejoras específicas para QyrexAI y consistencia visual con el panel principal.
- `manifest.webmanifest` para experiencia instalable en navegadores compatibles.
- Limpieza de respaldos de credenciales hardcodeadas: servicios externos usan Environment Variables.
- `.env.example` como referencia para despliegue en Render.

# Qyrex Ultra v6 — Developer Toolbox

- Developer Toolbox global con 9 módulos de productividad y diagnóstico.
- JSON Lab para validar, formatear y minificar JSON en local.
- Same-Origin API Probe con medición de latencia y timeout.
- Text Lab con caracteres, palabras, líneas y bytes UTF-8.
- URL Lab para encode/decode de componentes.
- Regex Lab para pruebas de patrones sin enviar contenido al servidor.
- Time Lab con conversión Unix y generación de UUID v4.
- Local Snippets Vault para guardar snippets únicamente en el dispositivo.
- System panel con métricas de DOM, runtime y almacenamiento.
- Barra contextual rápida dentro del workspace.
- Nuevos atajos: `Ctrl/Cmd + Shift + X` y teclas `1`–`9` dentro de Toolbox.
- Capa v6 específica para QyrexAI: estadísticas, copiar respuesta, exportar Markdown y compactar prompts.
- Service Worker actualizado para cachear los nuevos recursos v6 sin cachear `/api/*`.
