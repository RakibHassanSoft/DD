# Mailflow Deployment Guide — Render + Netlify

This is a beginner-friendly guide for deploying Mailflow manually:

- **Render** runs the API and the email worker.
- **Netlify** runs the frontend.
- **MongoDB Atlas** stores users, contacts, campaigns, and analytics.
- **Managed Redis** stores campaign jobs for BullMQ.

There is intentionally **no CI/CD**. You choose when to deploy from the Render and Netlify dashboards.

> Important: use a custom domain with two subdomains before inviting users:
>
> - `app.yourdomain.com` → Netlify
> - `api.yourdomain.com` → Render
>
> These share the same parent domain, so secure login cookies work reliably. Do not rely on the default combination of `netlify.app` and `onrender.com` for production authentication.

---

## What you need before starting

Create these accounts first:

1. A GitHub account and a repository containing this project.
2. A [MongoDB Atlas](https://www.mongodb.com/atlas) account.
3. A Redis provider account. Upstash, Redis Cloud, or a Render Key Value instance are suitable.
4. A [Render](https://render.com/) account.
5. A [Netlify](https://www.netlify.com/) account.
6. A [Google Cloud](https://console.cloud.google.com/) project for Gmail OAuth.
7. A Gemini API key, if you want AI template generation.
8. A domain name, such as `yourdomain.com`.

Do **not** add passwords, API keys, tokens, or `.env` files to GitHub.

---

## Part 1 — Put the project on GitHub

1. Create a new private GitHub repository.
2. Upload or push this project to that repository.
3. Confirm these deployment files are present at the repository root:

   ```text
   render.yaml
   netlify.toml
   DEPLOYMENT_GUIDE.md
   apps/api/Dockerfile
   ```

4. Confirm `.env` is not visible in GitHub. It is already ignored by this project.

---

## Part 2 — Create MongoDB Atlas

1. In MongoDB Atlas, create a production project and a cluster.
2. Open **Database Access** and create a database user.
3. Give the user `readWrite` access to your application database. Save the username and password safely.
4. Open **Network Access**. Allow the network access required by Render. For initial setup, Atlas commonly uses `0.0.0.0/0`; restrict this later if your Render plan/network setup allows it.
5. Click **Connect** → **Drivers** → **Node.js**.
6. Copy the connection string. It looks similar to this:

   ```text
   mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/mailflow?retryWrites=true&w=majority
   ```

7. Replace `USERNAME` and `PASSWORD` with the database user's encoded credentials. Keep this full value private. You will use it as `MONGODB_URI`.
8. In Atlas, enable continuous cloud backups or scheduled snapshots. This is your recovery copy of users, contacts, campaigns, and suppression records.

---

## Part 3 — Create Redis

1. Create a managed Redis database.
2. Copy its connection URL. For a hosted TLS Redis database, it should normally begin with `rediss://`.
3. Save this private value as `REDIS_URL`.

The API and worker must use the **same** Redis URL. Without Redis and the worker, campaign launch and scheduled sends cannot work.

---

## Part 4 — Prepare Google OAuth and Gmail

1. Open Google Cloud Console and choose or create a project.
2. Enable **Gmail API**.
3. Open **APIs & Services** → **OAuth consent screen**.
4. Complete the consent-screen details truthfully, including your support email, authorized domain, privacy policy, and terms pages when Google requests them.
5. Add the scopes requested by this application:

   ```text
   openid
   email
   profile
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.metadata
   ```

6. Open **Credentials** → **Create Credentials** → **OAuth client ID**.
7. Choose **Web application**.
8. Add this exact authorized redirect URI. Replace the domain with your own API domain:

   ```text
   https://api.yourdomain.com/api/google/callback
   ```

9. Copy the Client ID and Client secret. You will use them as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Google must approve or allow your consent configuration before every intended user can connect Gmail. If the OAuth consent app is still in testing mode, add your own account as a test user.

---

## Part 5 — Create your domains

Create these DNS records with your domain provider later when Render and Netlify give you their target values:

| Purpose | Domain | Hosted by |
| --- | --- | --- |
| Frontend | `app.yourdomain.com` | Netlify |
| API | `api.yourdomain.com` | Render |

Do not create the Google redirect URI using a temporary `onrender.com` address if you plan to switch to a custom API domain. Use the final API domain from the start where possible.

---

## Part 6 — Deploy the API and worker on Render

### 6.1 Create Render services

1. Sign in to Render.
2. Choose **New** → **Blueprint**.
3. Connect the GitHub repository.
4. Select the repository branch containing this project.
5. Render reads `render.yaml` and shows two services:

   - `mailflow-api` — public Express API
   - `mailflow-worker` — private background campaign worker

6. Keep the region the same for both services.
7. Create the Blueprint. Choose a paid worker plan if Render does not offer a free background-worker option for your account.
8. Leave automatic deploys off. The included Blueprint uses `autoDeployTrigger: "off"`.

### 6.2 Add environment variables

Open **mailflow-api** → **Environment** and add these values:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Your private Atlas connection string |
| `REDIS_URL` | Your private Redis URL |
| `JWT_SECRET` | A new, long random secret (at least 32 characters) |
| `JWT_EXPIRES_IN` | `7d` |
| `ENCRYPTION_KEY` | Base64 encoded random 32-byte key |
| `CLIENT_ORIGIN` | `https://app.yourdomain.com` |
| `COOKIE_SAME_SITE` | `lax` |
| `PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client secret |
| `GOOGLE_REDIRECT_URI` | `https://api.yourdomain.com/api/google/callback` |
| `GEMINI_API_KEY` | Your Gemini API key |

Then open **mailflow-worker** → **Environment** and add the same values, except `PORT` is not necessary for the worker.

Generate an encryption key in PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Generate a JWT secret in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Never reuse development secrets in production.

### 6.3 Add the Render custom domain

1. Open **mailflow-api** → **Settings** → **Custom Domains**.
2. Add `api.yourdomain.com`.
3. Render shows the required DNS record. Create that exact record at your domain provider.
4. Wait until Render shows the domain as verified and HTTPS is active.
5. Do not add a public domain to the worker.

### 6.4 Deploy and verify the API

1. Choose **Manual Deploy** → **Deploy latest commit** for `mailflow-api`.
2. Wait for Render to pass its health check.
3. In a browser, open:

   ```text
   https://api.yourdomain.com/api/health/live
   ```

   Expected result:

   ```json
   { "status": "ok" }
   ```

4. Open:

   ```text
   https://api.yourdomain.com/api/health/ready
   ```

   Expected result:

   ```json
   { "status": "ok", "database": "connected" }
   ```

5. Deploy `mailflow-worker` manually. Its logs should include `campaign_worker_started`.

If readiness returns `503`, check the Render API logs and the Atlas connection/network-access settings before continuing.

---

## Part 7 — Deploy the frontend on Netlify

This guide uses the Netlify CLI so deployments remain manual. Do not link the Netlify site to GitHub unless you specifically want automatic deploys.

1. In Netlify, choose **Add new project** → **Deploy manually** and create an empty site. Write down its site name.
2. In your local project folder, install nothing globally. Run:

   ```powershell
   npx netlify login
   npx netlify link
   ```

   The second command asks you to choose the empty Netlify site you just created.
3. Netlify reads `netlify.toml` from this project. It builds the Next.js frontend under `apps/web`.
4. In Netlify, open **Project configuration** → **Environment variables**, then add:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |

5. Do not add `JWT_SECRET`, database URLs, Google secrets, encryption keys, or Gemini keys to Netlify. Anything beginning with `NEXT_PUBLIC_` can be visible in the browser.
6. From your local project folder, trigger the first manual production deploy:

   ```powershell
   npx netlify deploy --build --prod
   ```

   This is manual: it builds the current local code and publishes it. It does not create a GitHub Actions workflow or enable automatic deployments.
7. Open **Domain management** and add `app.yourdomain.com`.
8. Create the exact DNS record Netlify shows at your domain provider.
9. Wait for Netlify to verify the domain and issue HTTPS.

After the Netlify domain works, return to Render and verify that `CLIENT_ORIGIN` is exactly:

```text
https://app.yourdomain.com
```

There must be no trailing slash. Manually redeploy both Render services after changing an environment variable.

---

## Part 8 — Final Google OAuth check

Before testing Google connection, confirm all three values agree exactly:

| Where | Required URL |
| --- | --- |
| Google Cloud authorized redirect URI | `https://api.yourdomain.com/api/google/callback` |
| Render `GOOGLE_REDIRECT_URI` | `https://api.yourdomain.com/api/google/callback` |
| Render `PUBLIC_API_URL` | `https://api.yourdomain.com` |

Also confirm Render `CLIENT_ORIGIN` is `https://app.yourdomain.com`.

Now open `https://app.yourdomain.com` and test in this order:

1. Register a new account.
2. Refresh the page. You should remain logged in.
3. Sign out and sign in again.
4. Connect a Google sender account.
5. Confirm Google returns you to the frontend and the sender appears as connected.
6. Import a small test CSV with only your own email address.
7. Generate templates, create a test campaign, run safety checks, and send only a self-addressed test email.

Do not launch a campaign to real recipients until these checks pass.

---

## Part 9 — Test health and basic load safely

From your computer, run a health-only test after deployment:

```powershell
$env:API_URL = 'https://api.yourdomain.com/api'
npm run test:load
```

It sends only `GET /api/health/live` requests. It cannot log in, create data, or send email.

For a small increase in test size:

```powershell
$env:API_URL = 'https://api.yourdomain.com/api'
$env:REQUESTS = '50'
$env:CONCURRENCY = '5'
npm run test:load
```

Do not use this as a stress test against a small Render plan. Review capacity and Render logs first.

---

## Part 10 — Monitoring and manual updates

### What to monitor

In Render, monitor API and worker logs for these JSON events:

```text
unhandled_api_error
http_request_failed
database_disconnected
campaign_job_failed
queue_worker_error
campaign_worker_start_failed
```

Set Render notification alerts for failed deployments and service incidents.

### How to deploy an update manually

1. Make code changes locally.
2. Run:

   ```powershell
   npm.cmd run check
   npm.cmd run build
   npm.cmd run test
   ```

3. Push only the tested code to GitHub.
4. In Render, manually deploy the API first, wait for `/api/health/ready` to pass, then manually deploy the worker.
5. From your local project folder, run `npx netlify deploy --build --prod`.
6. Verify login, sender connection, and health endpoints.

### How to roll back

1. If the API is unhealthy, do not start or resume campaigns.
2. In Render, select the last healthy deploy and roll back the API or worker.
3. In Netlify, publish the last successful deploy.
4. Recheck `/api/health/ready`.

### How to recover data

1. Restore the latest Atlas backup into a **new** database first.
2. Verify users, campaigns, contacts, and suppression data.
3. During a maintenance window, change `MONGODB_URI` on both Render services to the restored database.
4. Deploy both services manually and verify readiness.

---

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Render API fails to deploy | Open Render logs; verify every required environment variable is set and `PORT=10000`. |
| `/api/health/ready` returns `503` | Check MongoDB URI, Atlas database user password, and Atlas network access. |
| Login works once but disappears after refresh | Verify custom subdomains are used, `COOKIE_SAME_SITE=lax`, HTTPS is active, and `CLIENT_ORIGIN` exactly matches the frontend origin. |
| Browser shows CORS error | Check `CLIENT_ORIGIN` is the exact `https://app.yourdomain.com` URL without `/`, then redeploy the API. |
| Google says redirect URI mismatch | Compare the Google setting and `GOOGLE_REDIRECT_URI` character by character. |
| Campaign starts but no emails are sent | Verify the worker service is running, both services share the same `REDIS_URL`, and sender controls/campaign safety check pass. |
| AI template generation fails | Verify `GEMINI_API_KEY` exists on the API and worker, and that the key has access to the configured Gemini model. |
| Worker crashes after deployment | Check `MONGODB_URI`, `REDIS_URL`, and the worker’s Render logs; redeploy only after the cause is fixed. |

---

## Deployment complete checklist

- [ ] MongoDB Atlas is connected and backups are enabled.
- [ ] Managed Redis is connected.
- [ ] Render API is deployed and `/api/health/ready` returns `200`.
- [ ] Render worker is deployed and logs `campaign_worker_started`.
- [ ] `api.yourdomain.com` is verified with HTTPS.
- [ ] Netlify frontend is deployed.
- [ ] `app.yourdomain.com` is verified with HTTPS.
- [ ] `CLIENT_ORIGIN`, `NEXT_PUBLIC_API_URL`, `PUBLIC_API_URL`, and `GOOGLE_REDIRECT_URI` use the final domains.
- [ ] Google OAuth redirect URI is configured exactly.
- [ ] Registration, login refresh, logout, Google connection, and a self-addressed test email work.
- [ ] Render incident notifications and Atlas backups are enabled.
