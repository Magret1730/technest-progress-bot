# TechNest Slack Bot

A simple Slack bot that sends a message to a channel **now** or on a **weekly schedule**.

All message, channel, schedule, and status settings are saved from the dashboard — not from environment variables.

---

## Environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (`xoxb-...`) |
| `TEST_API_SECRET` | Yes | Protects dashboard save and send actions |
| `CRON_SECRET` | Vercel cron | Protects the scheduled send endpoint |
| `KV_REST_API_URL` | Vercel | Vercel KV for persistent settings |
| `KV_REST_API_TOKEN` | Vercel | Vercel KV token |

Never commit `.env`.

---

## Slack app setup

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add bot scope: **`chat:write`**
3. Install the app to your workspace
4. Copy the **Bot User OAuth Token** into `.env` as `SLACK_BOT_TOKEN`
5. Create or choose a Slack channel and invite the bot with `/invite @YourBotName`
6. Copy the channel ID (starts with **C** for public or **G** for private)

---

## Dashboard

Open the app and configure:

| Field | Description |
|-------|-------------|
| **Message** | Text to send |
| **Slack channel ID** | Target channel (`C...` or `G...`) |
| **Schedule** | Send now, or schedule weekly |
| **Cron expression** | Required when weekly is selected (example: `0 12 * * 0`) |
| **Status** | Active or Paused |
| **API secret** | Your `TEST_API_SECRET` |

Buttons:

- **Save settings** — persists to local JSON or Vercel KV
- **Send now** — sends immediately (works even when Paused)

When **Paused**, scheduled sends are skipped. Manual **Send now** still works.

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run send       # send using saved settings
npm run schedule   # local weekly scheduler (requires saved weekly settings)
npm run check-slack
```

---

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | App health check |
| `/api/settings` | GET | Read saved settings |
| `/api/settings` | POST | Save settings (requires `TEST_API_SECRET`) |
| `/api/send-message` | POST | Send now (requires `TEST_API_SECRET`) |
| `/api/cron/send-message` | GET | Weekly cron send (requires `CRON_SECRET`) |

---

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add Vercel KV for persistent settings
4. Set `SLACK_BOT_TOKEN`, `TEST_API_SECRET`, `CRON_SECRET`, and KV env vars
5. [`vercel.json`](vercel.json) runs the cron job — it only sends when saved settings use **Schedule weekly** and status is **Active**

Vercel Cron uses **UTC**. Adjust the cron schedule in `vercel.json` if needed.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `SLACK_BOT_TOKEN is missing` | Add token to `.env` or Vercel |
| `Channel ID is required` | Enter a channel ID on the dashboard and save |
| `Channel ID must start with C or G` | Use a valid Slack channel ID |
| `The bot is not in this channel` | `/invite @YourBotName` in the channel |
| `Unauthorized` | Enter your `TEST_API_SECRET` on the dashboard |
| Settings reset on Vercel | Link a Vercel KV store |

---

## Project structure

```
slack/
├── app/page.tsx              # Dashboard
├── app/api/settings/         # Save and load settings
├── app/api/send-message/     # Send now
├── app/api/cron/send-message/# Scheduled send
├── lib/slack.js              # chat.postMessage only
├── lib/settings.js           # Persistent settings
├── data/settings.json        # Local storage (gitignored)
└── src/send-message.js       # CLI send
```
