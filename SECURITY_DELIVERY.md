# Qyrex secure delivery

La entrega protegida usa dos fases:

1. El endpoint público devuelve un loader mínimo, nunca el payload real.
2. El loader solicita un ticket temporal de entrega.
3. El ticket está firmado, tiene vida corta, está ligado a IP + User-Agent y se consume una sola vez.
4. La respuesta protegida usa `no-store` y `nosniff`.
5. El sistema incorpora rate limiting y controles anti-abuso para reducir scraping, replay y acceso automatizado.

## Secrets

Las credenciales de servicios externos no deben escribirse en `server.js`, `obf-jobs.js` ni archivos públicos. Configúralas en Render Environment Variables usando `.env.example` únicamente como referencia. El repositorio no debe contener valores reales para `JWT_SECRET`, `MONGO_URI`, `DISCORD_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `QYREXOBF_API_KEY`, `API_KEY` o `VOLTILS_API_KEY`.

## Límite técnico

Ningún cliente que deba ejecutar Lua puede ser técnicamente imposible de dumpear. El payload tiene que existir en memoria del cliente para poder ejecutarse. Estas capas reducen exposición estática, replay, scraping y acceso directo al endpoint, pero no convierten un payload ejecutado en el cliente en secreto absoluto.
