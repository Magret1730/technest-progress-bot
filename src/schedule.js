require('dotenv').config();

const cron = require('node-cron');
const { sendMessage, formatSlackError } = require('../lib/slack');
const { getSettings } = require('../lib/settings');

async function startScheduler() {
  const settings = await getSettings();

  if (!settings.hasSavedSettings) {
    console.error('No saved settings found. Save settings on the dashboard first.');
    process.exit(1);
  }

  if (settings.scheduleMode !== 'weekly') {
    console.error('Weekly schedule is not enabled. Choose "Schedule weekly" and save settings.');
    process.exit(1);
  }

  if (!cron.validate(settings.scheduleCron)) {
    console.error(`Invalid schedule cron: "${settings.scheduleCron}"`);
    process.exit(1);
  }

  console.log('Slack weekly scheduler running.');
  console.log(`Message: "${settings.messageText}"`);
  console.log(`Channel: ${settings.slackChannelId}`);
  console.log(`Bot status: ${settings.status}`);
  console.log(`Schedule: ${settings.scheduleCron} (${settings.scheduleDescription}, local time)`);
  console.log('Press Ctrl+C to stop.\n');

  cron.schedule(settings.scheduleCron, async () => {
    const timestamp = new Date().toLocaleString();
    try {
      const current = await getSettings();

      if (current.status === 'Paused') {
        console.log(`[${timestamp}] Skipped: bot status is Paused`);
        return;
      }

      if (current.scheduleMode !== 'weekly') {
        console.log(`[${timestamp}] Skipped: schedule mode is not weekly`);
        return;
      }

      const result = await sendMessage();
      console.log(`[${timestamp}] Sent "${result.text}" to ${result.channel}`);
    } catch (error) {
      console.error(`[${timestamp}] Failed: ${formatSlackError(error)}`);
    }
  });
}

startScheduler().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
