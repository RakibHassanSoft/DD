# Mailflow — Phases 1–7

This workspace is organized by product module, so related files stay together:

```text
apps/api/src/modules/
  auth/       # registration, login, logout, current session
  users/      # User persistence and public user representation
  senders/    # Google OAuth, token lifecycle, sender management, Gmail test send
  contacts/   # contact lists, file parsing, mapping, validation, deduplication
  templates/  # Gemini generation, editable templates, selection, personalization
  campaigns/  # campaign configuration, safety review, scheduler, email-job worker
  suppressions/ # unsubscribe handling, recipient suppression, deliverability safeguards
  analytics/  # campaign metrics, recipient activity, sender performance, reply sync
apps/web/features/
  auth/       # authentication screen and API calls
  dashboard/  # authenticated workspace
  senders/    # sender account UI and API calls
  contacts/   # import wizard, column mapping, preview, contact list display
  templates/  # Gemini template studio, editor, selection, personalized preview
  campaigns/  # campaign draft, safety review, controlled launch and controls
  suppressions/ # suppression list management and recipient protection
  analytics/  # analytics dashboard and Gmail metadata reply sync
apps/web/lib/
  api-client.ts # the frontend's single HTTP boundary to the API
```

## Frontend and backend are separate

- `apps/api` is an Express/MongoDB/Redis service. It owns authentication, data validation, database access, Gmail, Gemini, and campaign workers. It never imports UI code.
- `apps/web` is a Next.js browser application. It contains pages, UI, and feature-specific API adapters. It never imports API source, database models, queue code, or provider SDKs.
- `apps/web/lib/api-client.ts` is the only shared browser transport layer. Configure its deployed target with `NEXT_PUBLIC_API_URL`; it sends the HTTP-only session cookie with every API request.
- Run each service independently: `npm run dev:api`, `npm run dev:web`, and, when campaigns are active, `npm run dev:worker`.

## Phase 1 — Authentication

- Register with name, email, and password
- Login using an HTTP-only JWT cookie
- Retrieve the authenticated user profile
- Logout and clear the session cookie
- Validate inputs with Zod and hash passwords with bcrypt

## Phase 2 — Gmail sender connection

- Connect a Google account with the server-side OAuth flow
- Request only identity scopes plus `gmail.send`
- Keep access and refresh tokens encrypted at rest with AES-256-GCM
- Keep refresh tokens off the browser entirely
- List, disconnect, and reconnect sender accounts
- Send a connection test only to the connected sender address
- Mark a sender as reconnect-required after authentication failures

## Phase 3 — Contacts

- Upload CSV, XLS, and XLSX contact files (10 MB / 20,000 rows maximum)
- Detect common email, name, company, title, and website columns
- Let users adjust the column mapping before import
- Validate email syntax and remove both file-level and existing-contact duplicates
- Preserve unmapped source columns as custom fields
- Flag contacts missing a first name as `incomplete` for later personalization review
- Store only valid, deduplicated contacts in contact lists

## Phase 4 — AI templates and personalization

- Generate exactly five campaign-specific Gmail templates through Gemini
- Use a strict JSON response and server-side Zod validation before saving output
- Instruct Gemini to work only from campaign-provided facts, without inventing prospect or company details
- Edit, save, and select a preferred template
- Render a real-contact preview with supported variables and custom fields
- Show safe fallbacks and missing-variable warnings before any campaign is created

Set `GEMINI_API_KEY` only in the server `.env`. Do not use a `NEXT_PUBLIC_` variable or expose the key in browser code.

## Phase 5 — Campaign engine and controlled queue

- Create campaign drafts from a sender, contact list, selected template, and schedule
- Run a mandatory safety review before launch
- Spread the initial batch across configured sending days and windows
- Enforce campaign daily limits, sender connection status, and personalization completeness in the worker
- Use Redis + BullMQ; never send from the campaign API request
- Pause a campaign after terminal provider failures; support pause, resume, and stop controls

Set `REDIS_URL` and start the worker separately with `npm run dev:worker`. The worker is the only process that can call Gmail for a campaign send.

## Phase 6 — Deliverability controls

- Add and manage permanent suppression records for unsubscribe, hard-bounce, invalid, manual-block, and provider-restriction reasons
- Include a signed one-click unsubscribe URL and `List-Unsubscribe` header on campaign messages
- Check suppression status before every worker send and mark matching jobs as `suppressed`
- Enforce user-configurable sender controls, including an enabled switch and a daily limit
- Classify provider errors as authentication, temporary, restriction, or hard-bounce signals
- Retry temporary provider errors with exponential backoff; require reconnection for authentication errors
- Record hard bounces/provider restrictions and automatically pause campaigns after terminal or abnormal delivery signals

## Phase 7 — Analytics and template library

- View workspace metrics for sent, scheduled, failed, suppressed, replies, and unsubscribes
- Review campaign activity and recipient-level delivery status
- Review per-sender sent, failed, and reply totals
- Sync reply metadata using Gmail thread IDs, RFC message IDs, and `In-Reply-To` / `References` headers; message bodies are not read
- Create, save, edit, preview, select, and reuse your own templates alongside Gemini-generated templates

Reply sync requires the `gmail.metadata` OAuth scope. Existing sender accounts must reconnect once to grant it; no Gmail message body access is requested.

## Phase 8 — Production operations

- Docker image shared by the Render API and BullMQ worker, with separate service commands
- Render Blueprint with readiness checks and manual-only deployment enabled
- Netlify production build configuration for the separated Next.js frontend
- Security headers, CORS credentials, production cross-site cookie support, global API throttling, request IDs, and structured safe error/worker logs
- Liveness (`/api/health/live`) and database readiness (`/api/health/ready`) endpoints
- A health-only load probe and a MongoDB backup, restore, incident-response, and manual-deployment runbook

For a detailed beginner walkthrough, follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). A shorter operations reference is also available in [the production deployment runbook](docs/production-deployment.md). Phase 8 intentionally has no CI/CD workflow or GitHub Actions configuration.

## Prerequisites

- Node.js 20+
- MongoDB running locally or a MongoDB connection string

## Setup

1. Copy `.env.example` to `.env` and set `JWT_SECRET` to a strong random value.
2. Set `ENCRYPTION_KEY` to a base64-encoded 32-byte key. For PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`.
3. In Google Cloud, enable the Gmail API and create a **Web application** OAuth client. Add the exact `GOOGLE_REDIRECT_URI` from `.env` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Set `GEMINI_API_KEY` for Phase 4 and `REDIS_URL` for Phase 5. Run a Redis instance before launching campaigns.
5. Run `npm install`.
6. Run `npm run dev:api`, `npm run dev:web`, and (for campaigns) `npm run dev:worker` in separate terminals.
7. Open `http://localhost:3000`.

The API runs on port 4000 and the frontend runs on port 3000. In production, serve both over HTTPS; cookie `secure` mode activates automatically when `NODE_ENV=production`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/auth/me` | Read the authenticated profile |
| GET | `/api/health` | Check service and database status |
| GET | `/api/google/connect` | Begin Google OAuth (authenticated) |
| GET | `/api/google/callback` | Handle Google OAuth callback |
| GET | `/api/senders` | List the user’s sender accounts |
| POST | `/api/senders/:senderId/test-email` | Send a self-addressed connection test |
| DELETE | `/api/senders/:senderId` | Disconnect a sender account |
| POST | `/api/lists/import/preview` | Parse and validate an upload before importing |
| POST | `/api/lists/import` | Create a validated, deduplicated contact list |
| GET | `/api/lists` | List the user’s contact lists |
| GET | `/api/lists/:listId` | Read a contact list and its first 100 contacts |
| GET | `/api/contacts` | List up to 200 imported contacts for personalization preview |
| POST | `/api/ai/generate-templates` | Generate and save five Gemini templates |
| GET | `/api/templates` | List the user’s saved templates |
| PATCH | `/api/templates/:templateId` | Edit a template |
| POST | `/api/templates/:templateId/select` | Select a template from its generated set |
| POST | `/api/templates/:templateId/preview` | Render a template for an imported contact |
| POST | `/api/campaigns` | Create a campaign draft |
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/campaigns/:campaignId` | Read campaign and email-job status counts |
| POST | `/api/campaigns/:campaignId/safety-check` | Run launch safety checks |
| POST | `/api/campaigns/:campaignId/start` | Create controlled BullMQ email jobs |
| POST | `/api/campaigns/:campaignId/pause` | Pause a campaign |
| POST | `/api/campaigns/:campaignId/resume` | Resume a campaign |
| POST | `/api/campaigns/:campaignId/stop` | Stop a campaign |
| GET | `/api/suppressions` | List a user’s suppressed recipients |
| POST | `/api/suppressions` | Add a manual suppression record |
| GET | `/api/unsubscribe?token=…` | Honor a signed recipient unsubscribe request |
| PATCH | `/api/senders/:senderId/controls` | Update sender enabled state and daily limit |
| POST | `/api/templates` | Save a custom email template for future campaigns |
| GET | `/api/analytics/overview` | View workspace and sender performance metrics |
| GET | `/api/analytics/campaigns/:campaignId` | View campaign metrics, activity, and recipient status |
| POST | `/api/analytics/campaigns/:campaignId/sync-replies` | Sync Gmail reply metadata for a campaign |

Passwords are never returned by the API or stored in plaintext. JWTs are never exposed to frontend JavaScript.

Google’s OAuth flow validates `state` on the callback, uses offline access for refresh tokens, and scopes sending to `gmail.send`. Google documents `gmail.send` as a valid authorization scope for `users.messages.send`; campaign delivery can occur only in the Phase 5 worker after its safety checks pass.
"# DD" 
