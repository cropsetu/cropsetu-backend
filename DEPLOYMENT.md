# Deployment — CropSetu Backend (Node + FastAPI)

End-to-end guide to deploy this repo to [Railway](https://railway.app) under the `cropsetu` account.

---

## Prerequisites

- GitHub repo: **https://github.com/cropsetu/cropsetu-backend** (already pushed)
- Railway account (sign up with the same GitHub account for easiest repo linking)
- Railway project ID: `bd98ed10-e1bf-4e6f-afa8-67476be05b1d`
- Credit card on Railway (after the $5 starter credit)
- API keys ready (see [`.env.example`](./.env.example))

---

## Architecture on Railway

One Railway **project** containing four services:

```
┌─────────────────────────────────────────────────────────────┐
│ Railway project: cropsetu (id: bd98ed10-...)                │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐               │
│  │ cropsetu-api   │──┐   │ cropsetu-ai      │               │
│  │ (Node, 3001)   │  │   │ (FastAPI, 8001)  │               │
│  │ public URL ✓   │  │   │ private only     │               │
│  └────────────────┘  │   └──────────────────┘               │
│         │            │           │                          │
│         │            │           │                          │
│         ▼            ▼           ▼                          │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │ PostgreSQL   │  │ Redis            │                    │
│  │ plugin       │  │ plugin           │                    │
│  └──────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Create the Node backend service

1. Open your Railway project (`bd98ed10-e1bf-4e6f-afa8-67476be05b1d`)
2. **New → GitHub Repo** → select `cropsetu/cropsetu-backend`
3. Railway auto-detects Node. Name it **`cropsetu-api`**.
4. Under **Settings → Build**: leave the defaults (`npm ci` + `npm run build` if present)
5. Under **Settings → Deploy**:
   - Start command: `npm run start:prod`
   - Watch paths: `src/**/*` and `prisma/**/*` (so it doesn't redeploy on FastAPI changes)
6. Under **Settings → Networking**: **Generate Domain** → you'll get a URL like `cropsetu-api-production-abcd.up.railway.app`

## Step 2 — Add PostgreSQL

1. **New → Database → Add PostgreSQL**
2. Railway injects `DATABASE_URL` into every service in the project automatically
3. Optional: under the Postgres service → **Data** tab → you can run SQL queries here

## Step 3 — Add Redis

1. **New → Database → Add Redis**
2. `REDIS_URL` auto-injected

## Step 4 — Create the FastAPI service

1. **New → GitHub Repo** → same `cropsetu/cropsetu-backend` repo again
2. Name it **`cropsetu-ai`**
3. **Settings → Build**:
   - Root directory: `AI_CROP_DISESE_DETECTION`
   - Build command: `pip install -r requirements.txt`
4. **Settings → Deploy**:
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Watch paths: `AI_CROP_DISESE_DETECTION/**/*`
5. **Settings → Networking**:
   - Do NOT expose publicly (internal-only is safer)
   - Keep the private `cropsetu-ai.railway.internal` domain

## Step 5 — Wire cropsetu-api → cropsetu-ai

On the **cropsetu-api** service → Variables tab:

```
AI_BACKEND_URL=http://cropsetu-ai.railway.internal:8001
```

## Step 6 — Set all environment variables

Copy from [`.env.example`](./.env.example). Set the following on **cropsetu-api**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `API_PREFIX` | `/api/v1` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference syntax) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `AI_BACKEND_URL` | `http://cropsetu-ai.railway.internal:8001` |
| `JWT_SECRET` | run `openssl rand -base64 64` locally, paste |
| `FIELD_ENCRYPTION_KEY` | run `openssl rand -hex 32` locally, paste |
| `ALLOWED_ORIGINS` | `https://cropsetu.com,https://admin.cropsetu.com` (or leave blank to allow mobile app only) |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID` | from [msg91.com](https://msg91.com) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from [cloudinary.com](https://cloudinary.com) |
| `GEMINI_API_KEY` | from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `GROQ_API_KEY` | from [console.groq.com](https://console.groq.com) |
| `ANTHROPIC_API_KEY` | from [console.anthropic.com](https://console.anthropic.com) |
| `OPENWEATHER_API_KEY` | from [openweathermap.org](https://openweathermap.org) |
| `SARVAM_API_KEY` | from [sarvam.ai](https://sarvam.ai) |
| `DATA_GOV_API_KEY` | from [data.gov.in](https://data.gov.in) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | from [dashboard.razorpay.com](https://dashboard.razorpay.com/app/keys) |

On **cropsetu-ai**, set the subset it needs (see [`AI_CROP_DISESE_DETECTION/.env.example`](./AI_CROP_DISESE_DETECTION/.env.example)):

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
GEMINI_API_KEY=...
GROQ_API_KEY=...
ANTHROPIC_API_KEY=...
DATA_GOV_API_KEY=...
OPENWEATHER_API_KEY=...
```

## Step 7 — First deploy

Railway auto-deploys on every push to `main`. After your first push:

1. Watch the **cropsetu-api** Deploy log. You should see:
   ```
   [DB] PostgreSQL connected
   [Redis] Connected
   [Server] FarmEasy API running on http://localhost:3001/api/v1
   ```
2. On the public domain, test: `curl https://<your-railway-url>/health` → `{"status":"ok"}`

## Step 8 — Run migrations + seed

The `start:prod` script in package.json already runs `prisma migrate deploy`. First deploy will run migrations automatically.

To seed MSP rates + schemes into the production DB:

1. Open the **cropsetu-api** service → **Settings → ...** (three dots) → **Run a Command**
2. Run: `npm run db:seed`
3. Expected output: `[Seed MSP] Done — 20 rows`, `[Seed Schemes] Done — 9 schemes`

Or via Railway CLI from your laptop:
```bash
railway run --service cropsetu-api npm run db:seed
```

## Step 9 — Verify end-to-end

From your laptop:

```bash
BACKEND=https://<your-railway-url>
curl $BACKEND/health                                              # → {"status":"ok"}
curl $BACKEND/api/v1/mandi/commodities -H 'Authorization: Bearer x'  # → 401 invalid token (good!)
curl -X POST $BACKEND/api/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9876543210"}'                                      # → {success:true, ...}
```

---

## Custom domain (optional)

1. Buy a domain (e.g. `cropsetu.com`)
2. In Railway → **cropsetu-api → Settings → Networking → Custom Domain** → enter `api.cropsetu.com`
3. Railway shows DNS records to add at your registrar (CNAME to `<xxx>.up.railway.app`)
4. After DNS propagates, HTTPS is auto-provisioned via Let's Encrypt

---

## CI / CD

The workflow at [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push:

- Installs Node deps + runs `prisma generate`
- Syntax-checks all route/service/middleware/util files
- Installs Python deps + import-checks FastAPI routes

Railway's own GitHub integration handles actual deploys — no token needed for the common case.

If you want CI to trigger a manual redeploy, uncomment the `deploy` job in `ci.yml` and add a Railway API token as a GitHub secret:

1. Get token: https://railway.app/account/tokens → **Create Token**
2. GitHub repo → **Settings → Secrets and variables → Actions → New secret**:
   - Name: `RAILWAY_TOKEN`
   - Value: the token

---

## Rollbacks

Railway keeps all deploys. To roll back:

1. Open the service → **Deployments** tab
2. Find a previous successful deploy → click **...** → **Redeploy**

---

## Monitoring & logs

- **Railway Logs tab** — live stdout + stderr per service
- **Railway Metrics** — CPU, RAM, network per service
- Add **Sentry** for crash reporting (not wired in yet) — set `SENTRY_DSN` env var and install `@sentry/node` + initialize at the top of `src/server.js`

---

## Cost estimate (starter)

| Resource | Starter price |
|---|---|
| Hobby plan | $5/month (includes $5 usage credit) |
| cropsetu-api (small) | ~$2–5/month |
| cropsetu-ai (small) | ~$2–5/month |
| PostgreSQL | ~$1–3/month |
| Redis | ~$1/month |
| **Total** | **~$10–20/month** for low traffic |

Scales with traffic. Railway bills CPU-seconds + RAM-GB-hours.

---

## Troubleshooting

**`Permission denied to cropsetu` on git push**
- Your keychain has a token from another GitHub account. Generate a new classic PAT under cropsetu's Settings → Developer settings → Tokens.

**FastAPI returns 503 on `/agripredict/*`**
- These endpoints are partially stubs. Full implementation is tracked as a known gap in the main README.

**Mandi sync cron flooding FastAPI**
- Cron defined in `src/server.js` triggers daily at 00:30 UTC. Adjust batch size if needed.

**Out of memory on cropsetu-ai**
- The 5-agent Claude pipeline uses ~500MB peak. Upgrade Railway plan to increase RAM cap.
