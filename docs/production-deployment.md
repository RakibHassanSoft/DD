# Phase 8 production deployment

This project is configured for a **manual** Render API/worker deployment and a **manual** Netlify frontend deployment. It deliberately contains no GitHub Actions, GitHub workflow, or automatic deployment pipeline.

## 1. Create managed data services

1. Create a MongoDB Atlas production database. Create a least-privileged database user and put its TLS connection string in `MONGODB_URI`.
2. Create a managed Redis instance with TLS and authentication. Put its `rediss://` URL in `REDIS_URL` for both Render services.
3. In Atlas, enable continuous cloud backups (or schedule daily snapshots) before opening the application to users. Test a restore into a separate database at least once. Redis only contains resumable queue work; MongoDB is the durable source of campaign records.

## 2. Deploy the backend and worker on Render

1. In Render, create a Blueprint from this repository. It reads `render.yaml` and creates two Docker services: `mailflow-api` and `mailflow-worker`.
2. Keep **Auto-Deploy disabled** (it is set to `off` in `render.yaml`). Use Render's **Manual Deploy** button after you have tested a commit locally.
3. Enter every `sync: false` environment variable for both services. Use unique, production-only `JWT_SECRET` and base64 32-byte `ENCRYPTION_KEY` values. Never put them in Git, `render.yaml`, or Netlify.
4. After the web service receives its `https://<service>.onrender.com` URL, set `PUBLIC_API_URL` to that exact origin (without `/api`). Set `GOOGLE_REDIRECT_URI` to `https://<service>.onrender.com/api/google/callback` and add that identical URL to Google Cloud OAuth.
5. Render checks `/api/health/ready`. It returns `200` only when MongoDB is connected and responds to a ping. `/api/health/live` only confirms the process is running.

## 3. Deploy the frontend on Netlify

1. Create a Netlify site from the repository. The root `netlify.toml` builds only `apps/web` with Node 22.
2. In Netlify environment variables, set `NEXT_PUBLIC_API_URL=https://<service>.onrender.com/api`. This value is public by design; never set API secrets in Netlify.
3. Deploy manually with the Netlify dashboard or `netlify deploy --prod`. Do not link a repository for continuous deployment, or stop builds / lock the site if it was linked previously.
4. Copy the final Netlify site origin exactly (for example `https://your-site.netlify.app`) to Render's `CLIENT_ORIGIN`, then manually redeploy the API and worker.

The Render and Netlify default domains are cross-site. Production cookies therefore use `SameSite=None; Secure`. When you later use `app.example.com` and `api.example.com`, both share the same site and you may set `COOKIE_SAME_SITE=lax` for a stricter default.

## 4. Production verification and monitoring

Run these after every manual deployment:

```powershell
$env:API_URL = 'https://your-api.onrender.com/api'
npm run test:load
```

The probe sends only concurrent `GET /api/health/live` requests. It never authenticates, creates campaigns, or sends email. Start with `REQUESTS=25` and `CONCURRENCY=5`; increase gradually only after reviewing Render capacity and rate-limit behavior.

Review Render logs for JSON events such as `unhandled_api_error`, `campaign_job_failed`, `queue_worker_error`, `database_disconnected`, and `http_request_failed`. Configure Render notifications for failed deploys and service incidents. Never log OAuth tokens, passwords, email bodies, or unsubscribe tokens.

## 5. Manual rollback and incident response

1. If `/api/health/ready` fails, do not send traffic or resume campaigns. Inspect Render logs and database connectivity first.
2. If a worker repeatedly fails, pause affected campaigns in the application, then redeploy or roll back the worker in Render.
3. Roll back a Render service to its last healthy manual deploy. In Netlify, publish a previous successful deploy.
4. For data loss, restore the verified Atlas backup to a new database, validate it, and only then point the services to it during a maintenance window.
5. Rotate `JWT_SECRET`, `ENCRYPTION_KEY`, Google client secret, Gemini key, and Redis credentials after suspected exposure. Reconnecting senders is expected after OAuth credential rotation.
