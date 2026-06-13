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
| **Day of week / Time** | Friendly weekly schedule inputs (cron is generated automatically) |
| **Advanced cron** | Optional raw cron expression for power users |
| **Weekly schedule status** | Active or Paused |
| **API secret** | Your `TEST_API_SECRET` |

Schedule status at the top shows one of:

- **No schedule active** — no weekly cron is saved
- **Schedule active** — weekly schedule is saved and Active
- **Paused** — weekly schedule is saved but paused

Buttons:

- **Send now** — sends immediately using the current form values. Does **not** create or change a weekly schedule.
- **Save weekly settings** — persists message, channel, weekly schedule, and status for Vercel cron
- **Cancel schedule** — clears the saved weekly cron, switches mode to send now, and stops scheduled sends

Use **Cancel schedule** when you want to stop weekly sends entirely. **Send now** only sends once and does not activate a weekly schedule.

When **Paused**, scheduled sends are skipped but saved settings remain. Manual **Send now** still works.

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
| `/api/settings` | POST | Save weekly settings (requires `TEST_API_SECRET`) |
| `/api/settings/cancel` | POST | Cancel weekly schedule (requires `TEST_API_SECRET`) |
| `/api/send-message` | POST | Send now (requires `TEST_API_SECRET`) |
| `/api/cron/send-message` | GET | Weekly cron send (requires `CRON_SECRET`) |

---

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add Vercel KV for persistent settings
4. Set `SLACK_BOT_TOKEN`, `TEST_API_SECRET`, `CRON_SECRET`, and KV env vars
5. [`vercel.json`](vercel.json) runs the cron job — it only sends when saved settings use **Schedule weekly**, status is **Active**, and a cron expression exists

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
