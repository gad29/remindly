# Remindly: one app deployment

## CloudPanel + PM2

Use Node.js 20 or newer and PostgreSQL. Point the CloudPanel site's reverse proxy to `127.0.0.1:3001`.

```bash
npm install
npm run install:all
npm run build:web
cp backend/.env.example backend/.env
# Edit backend/.env. Keep OPENROUTER_API_KEY only here on the server.
pm2 start ecosystem.config.cjs --env production
pm2 save
```

If the project was uploaded without its existing `backend/package-lock.json` and `web-app/package-lock.json`, run `npm install --prefix backend` and `npm install --prefix web-app` once instead of `npm run install:all`.

The one PM2 process now serves the website, SPA routes, uploads, health check and API. After an update run `npm run build:web` and `pm2 restart remindly --update-env`.

Do not enable `DB_SYNC_ALTER` in production. Use explicit migrations before database changes.

## Windows installer

Run `npm run build:windows`. The installer is written to `release/`. On first launch, enter the HTTPS CloudPanel domain. The address can later be changed from **Remindly → Change server**.

## Android and iOS

The default production domain is `https://vps1remindly.ghsystems.work`. To build for a different installation, set `REMINDLY_APP_URL` before syncing. Then run `npm run mobile:android` or `npm run mobile:ios`. Android builds require Android Studio; iOS builds require Xcode on macOS.

The desktop and mobile shells load the same hosted application. The OpenRouter key remains on the VPS and is never packaged into an app.
