# TechNest Slack Bot

**TechNest Slack Bot** sends weekly TechNest progress updates to **Chan Meng** on Slack.

Default schedule: **every Sunday at 12:00 PM** with the message **"Hello Chan"**.

This project includes:

- An editable web dashboard (Next.js on Vercel)
- Persistent bot settings (JSON file locally, Vercel KV in production)
- API routes for health checks, settings, and manual test sends
- A Vercel Cron job for weekly delivery in production
- Local CLI scripts (`npm run send`, `npm run schedule`)

---

## Environment variables

Copy the template and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (`xoxb-...`) from [api.slack.com/apps](https://api.slack.com/apps) |
| `SLACK_USER_ID` | Recommended | Chan Meng's Slack member ID (`U...`). Opens a DM automatically. |
| `SLACK_CHANNEL_ID` | Optional | Fallback DM channel ID (`D0ATNMZ78AH` from your huddle URL) |
| `MESSAGE_TEXT` | No | Default weekly message (default: `Hello Chan`) |
| `SCHEDULE_CRON` | No | Default cron expression (default: `0 12 * * 0`) |
| `BOT_STATUS` | No | Default bot status: `Active` or `Paused` |
| `TEST_API_SECRET` | For dashboard | Protects save and test actions |
| `CRON_SECRET` | For Vercel cron | Protects `GET /api/cron/send-message` |
| `KV_REST_API_URL` | Vercel production | Vercel KV URL for persistent dashboard settings |
| `KV_REST_API_TOKEN` | Vercel production | Vercel KV token for persistent dashboard settings |

Never commit `.env`. It is listed in `.gitignore`.

---

## Editable dashboard

Open the app in your browser and use the dashboard to manage bot settings.

### What you can edit

- **Weekly message** — the Slack message text
- **Schedule cron expression** — e.g. `0 12 * * 0`
- **Status** — `Active` or `Paused`

### How settings are stored

| Environment | Storage |
|-------------|---------|
| Local dev | `data/settings.json` |
| Vercel | Vercel KV (when `KV_REST_API_*` env vars are set) |

On first load:

1. Saved settings are loaded if they exist
2. Otherwise `.env` defaults are used (`MESSAGE_TEXT`, `SCHEDULE_CRON`, `BOT_STATUS`)

### Save and test

1. Enter your `TEST_API_SECRET` in the **API secret** field
2. Edit message, cron, or status
3. Click **Save settings** to persist changes
4. Click **Send test message** to send the current message immediately

### Active vs Paused

| Status | Dashboard | Scheduled send | Manual test send |
|--------|-----------|----------------|------------------|
| `Active` | Shows Active | Sends on schedule | Works |
| `Paused` | Shows Paused | Skipped | Still works |

Save and test actions require `TEST_API_SECRET`. Random visitors cannot change settings or send messages without it.

---

## Part 1: Create your Slack app

### Step 1 — Create the app

1. Open [https://api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App** → **From scratch**
3. App name: e.g. `TechNest Slack Bot`
4. Workspace: **Technest Community**
5. **Create App**

### Step 2 — Add bot permissions

**OAuth & Permissions** → **Bot Token Scopes**:

- `chat:write`
- `im:write`

### Step 3 — Install and copy token

1. **Install to Technest Community**
2. Copy **Bot User OAuth Token** (`xoxb-...`)
3. Paste it into `.env` as `SLACK_BOT_TOKEN`

### Step 4 — Find Chan's Slack user ID

1. Open Chan Meng's Slack profile
2. Click **More** → **Copy member ID**
3. Paste into `.env` as `SLACK_USER_ID`

Alternatively, keep using `SLACK_CHANNEL_ID=D0ATNMZ78AH` from your huddle URL.

---

## Part 2: Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

### Send a message now

```bash
npm run send
```

### Run the local weekly scheduler

```bash
npm run schedule
```

The local scheduler reads saved settings from `data/settings.json` when available, otherwise `.env` defaults. It skips sending when status is `Paused`.

---

## Part 3: API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Confirms the app is live |
| `/api/settings` | GET | Read current bot settings (no secrets) |
| `/api/settings` | POST | Save settings (requires `TEST_API_SECRET`) |
| `/api/config` | GET | Alias of `/api/settings` |
| `/api/send-message` | POST | Manual test send (requires `TEST_API_SECRET`) |
| `/api/cron/send-message` | GET | Weekly send for Vercel Cron (requires `CRON_SECRET`) |

### Read settings

```bash
curl http://localhost:3000/api/settings
```

### Save settings

```bash
curl -X POST http://localhost:3000/api/settings \
  -H "Authorization: Bearer YOUR_TEST_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"messageText":"Hello Chan","scheduleCron":"0 12 * * 0","status":"Active"}'
```

### Test send

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Authorization: Bearer YOUR_TEST_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"messageText":"Hello Chan"}'
```

---

## Part 4: Deploy to Vercel

### 1. Push to GitHub

Repo: [technest-progress-bot](https://github.com/Magret1730/technest-progress-bot)

### 2. Add Vercel KV for persistent settings

1. In the Vercel project, go to **Storage** → **Create Database** → **KV**
2. Link the KV store to your project
3. Vercel will add `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and related env vars

Without KV, dashboard edits on Vercel will not persist across requests.

### 3. Set environment variables

Required:

- `SLACK_BOT_TOKEN`
- `SLACK_USER_ID` (or `SLACK_CHANNEL_ID`)
- `MESSAGE_TEXT`
- `SCHEDULE_CRON`
- `BOT_STATUS`
- `CRON_SECRET`
- `TEST_API_SECRET`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Using Vercel CLI:

```bash
npx vercel env add SLACK_BOT_TOKEN
npx vercel env add TEST_API_SECRET
npx vercel env add CRON_SECRET
```

### 4. Vercel Cron schedule

[`vercel.json`](vercel.json) runs the weekly job:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-message",
      "schedule": "0 12 * * 0"
    }
  ]
}
```

**Important:** Vercel Cron uses **UTC**. The cron handler reads saved settings and skips sending when status is `Paused`.

---

## Project structure

```
slack/
├── app/
│   ├── page.tsx                 # Editable dashboard
│   └── api/
│       ├── health/route.ts
│       ├── settings/route.ts
│       ├── send-message/route.ts
│       └── cron/send-message/route.ts
├── lib/
│   ├── slack.js                 # Slack send logic
│   ├── settings.js              # Settings storage
│   └── auth.js                  # TEST_API_SECRET checks
├── data/
│   └── settings.json            # Local saved settings (gitignored)
├── src/
│   ├── send-message.js          # Local CLI send
│   └── schedule.js              # Local cron scheduler
└── vercel.json
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `SLACK_BOT_TOKEN is missing` | Add token to `.env` or Vercel env vars |
| `Unauthorized` on save/test | Set `TEST_API_SECRET` and enter it on the dashboard |
| Settings reset on Vercel | Create and link a Vercel KV store |
| Scheduled send still runs while Paused | Confirm you clicked **Save settings** and status is `Paused` |
| `Message cannot be empty` | Enter text before saving or testing |

---

## Security notes

- Slack tokens and API secrets stay in environment variables only
- Save and test actions require `TEST_API_SECRET`
- Cron endpoint requires `CRON_SECRET`
- Dashboard never embeds secrets in frontend source code
