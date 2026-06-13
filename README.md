# TechNest Slack Bot

**TechNest Slack Bot** sends weekly TechNest progress updates to **Chan Meng** on Slack.

Default schedule: **every Sunday at 12:00 PM** with the message **"Hello Chan"**.

This project includes:

- A simple web dashboard (Next.js on Vercel)
- API routes for health checks and manual test sends
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
| `MESSAGE_TEXT` | No | Message to send (default: `Hello Chan`) |
| `SCHEDULE_CRON` | No | Cron expression (default: `0 12 * * 0`) |
| `TEST_API_SECRET` | For test button | Protects `POST /api/send-message` |
| `CRON_SECRET` | For Vercel cron | Protects `GET /api/cron/send-message` |

Never commit `.env`. It is listed in `.gitignore`.

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

This uses `SCHEDULE_CRON` in **your machine's local timezone**. It only runs while the process is active.

---

## Part 3: API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Confirms the app is live |
| `/api/config` | GET | Public app info and schedule (no secrets) |
| `/api/send-message` | POST | Manual test send (requires `TEST_API_SECRET`) |
| `/api/cron/send-message` | GET | Weekly send for Vercel Cron (requires `CRON_SECRET`) |

### Test send example

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Authorization: Bearer YOUR_TEST_API_SECRET" \
  -H "Content-Type: application/json"
```

---

## Part 4: Deploy to Vercel

### 1. Push to GitHub

This repo is designed for GitHub repo name: `technest-progress-bot`.

### 2. Import in Vercel

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Framework preset: **Next.js**
4. Add environment variables from `.env.example`

### 3. Set environment variables in Vercel

Required:

- `SLACK_BOT_TOKEN`
- `SLACK_USER_ID` (or `SLACK_CHANNEL_ID`)
- `MESSAGE_TEXT`
- `CRON_SECRET`
- `TEST_API_SECRET` (optional, enables dashboard test button)

Using Vercel CLI:

```bash
npx vercel login
npx vercel link
npx vercel env add SLACK_BOT_TOKEN
npx vercel env add SLACK_USER_ID
npx vercel env add MESSAGE_TEXT
npx vercel env add CRON_SECRET
npx vercel env add TEST_API_SECRET
npx vercel --prod
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

**Important:** Vercel Cron uses **UTC**. `0 12 * * 0` means Sunday 12:00 PM UTC, not your local time. Adjust the schedule in `vercel.json` to match your timezone.

Example: Sunday 12:00 PM Pacific (UTC-8) ≈ `0 20 * * 0`.

After changing `vercel.json`, redeploy.

---

## Project structure

```
slack/
├── app/
│   ├── page.tsx                 # Dashboard
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── health/route.ts
│       ├── config/route.ts
│       ├── send-message/route.ts
│       └── cron/send-message/route.ts
├── lib/
│   └── slack.js                 # Shared Slack send logic
├── src/
│   ├── send-message.js          # Local CLI send
│   └── schedule.js              # Local cron scheduler
├── vercel.json                  # Vercel Cron config
├── .env.example
└── README.md
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `SLACK_BOT_TOKEN is missing` | Add token to `.env` or Vercel env vars |
| `Set SLACK_USER_ID or SLACK_CHANNEL_ID` | Add Chan's member ID or DM channel ID |
| `Unauthorized` on test send | Set `TEST_API_SECRET` and enter it on the dashboard |
| `Unauthorized` on cron | Set `CRON_SECRET` in Vercel (Vercel sends it automatically) |
| Message not sent on schedule (Vercel) | Confirm cron schedule is UTC; check Vercel Cron logs |

---

## Security notes

- Slack tokens and secrets stay in environment variables only
- The dashboard never embeds tokens in frontend code
- Test sends require `TEST_API_SECRET` entered at runtime
- Cron endpoint requires `CRON_SECRET`
