# Render Deployment Checklist

Use this checklist when deploying the IoT dashboard to Render.

1. Push the project to GitHub.
2. Deploy using the included [`render.yaml`](render.yaml) blueprint, or create a new **Web Service** manually.
3. Connect the GitHub repository.
4. Confirm the build command is `npm install`.
5. Confirm the start command is `npm start`.
6. Make sure `SESSION_SECRET` exists in Render. The blueprint generates it automatically.
7. Keep `NODE_ENV=production` on Render so secure cookies are enabled.
8. Leave `PORT` unset in Render so the platform can assign it automatically.
9. Deploy the service.
10. Copy the Render URL into the ESP8266 firmware as `BACKEND_URL`.
11. Flash the ESP8266 sketch and verify sensor uploads, dashboard polling, and LCD updates.

## Local Environment Setup

1. Copy `.env.example` to `.env`.
2. Update `SESSION_SECRET` with a long random string.
3. Set `PORT` only if you want a custom local port.

## Common Checks

- Open `/health` to confirm the server is running.
- Open `/dashboard` after logging in to confirm the static frontend is served correctly.
- Register a test account and confirm session login works.
- Post one DHT11 reading from the ESP8266 and confirm it appears in history.
- Send one LCD message from the dashboard and confirm it appears on the display.
