# Qyrex Nexus v8

Esta revisión añade una capa de utilidades y observabilidad enfocada en el uso diario.

## Nuevas funciones
- Qyrex Cockpit con salud de API/Mongo y telemetría local.
- Quick Switcher y Command Center.
- Favoritos y actividad reciente locales.
- Diagnostics sin leer automáticamente tokens, contraseñas o contenido privado.
- Calm Mode para reducir movimiento.
- Instalación PWA mediante `beforeinstallprompt` cuando el navegador la ofrece.
- Health endpoint con versión, uptime, Node y timestamp sin secretos.

## Pruebas
Se valida sintaxis JS de la nueva capa y del backend, manifest JSON y referencias básicas. La ejecución completa de Render/Mongo depende de sus variables de entorno reales.
