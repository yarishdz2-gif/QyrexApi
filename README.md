# Lua u Vanguard · Developer Control Center

Plataforma profesional para gestionar, proteger, publicar y monitorizar scripts, keys, analytics y herramientas de desarrollo.

## Deploy en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) importa el repositorio.
3. Configura las variables de entorno:
   - `JWT_SECRET` — secreto largo y aleatorio
   - `MONGO_URI` — conexión a MongoDB (Atlas recomendado)
   - `OPENROUTER_API_KEY` (opcional)
   - Otras según `env.example`
4. Deploy.

## Local

```bash
npm install
# Configura .env con las variables de env.example
npm start
```

Logo actualizado a Lua u Vanguard.
