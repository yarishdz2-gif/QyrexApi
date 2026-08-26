[SECURITY_DELIVERY.md](https://github.com/user-attachments/files/31482252/SECURITY_DELIVERY.md)
# Qyrex secure delivery

La entrega usa dos fases:

1. El endpoint público devuelve un loader mínimo, nunca el payload real.
2. El loader solicita un ticket de entrega temporal.
3. El ticket está firmado, dura pocos segundos, está ligado a IP + User-Agent y se consume una sola vez.
4. Un navegador recibe la página pública/denegación y no el payload.
5. La respuesta de la fase protegida usa `no-store` y `nosniff`.

Importante: ningún cliente que deba ejecutar Lua puede ser técnicamente imposible de dumpear. El payload tiene que existir en memoria del cliente para poder ejecutarse. Esta capa reduce exposición estática, replay, scraping y acceso directo al endpoint.
