require('dotenv').config();

const cron = require('node-cron');
const { sendMessage, formatSlackError } = require('../lib/slack');
const { getSettings, isScheduleSendEnabled } = require('../lib/settings');

async function startScheduler() {
  const settings = await getSettings();

  if (!settings.hasSavedSettings) {
    console.error('No saved settings found. Save weekly settings on the dashboard first.');
    process.exit(1);
  }

  if (!isScheduleSendEnabled(settings)) {
    console.error('No active weekly schedule. Save or activate weekly settings first.');
    process.exit(1);
  }

  if (!cron.validate(settings.scheduleCron)) {
    console.error(`Invalid schedule cron: "${settings.scheduleCron}"`);
    process.exit(1);
  }

  console.log('Slack weekly scheduler running.');
  console.log(`Message: "${settings.messageText}"`);
  console.log(`Destination: ${settings.slackChannelId}`);
  console.log(`Schedule status: ${settings.scheduleStatus}`);
  console.log(`Schedule: ${settings.scheduleCron} (${settings.scheduleDescription}, local time)`);
  console.log('Press Ctrl+C to stop.\n');

  cron.schedule(settings.scheduleCron, async () => {
    const timestamp = new Date().toLocaleString();
    try {
      const current = await getSettings();

      if (!isScheduleSendEnabled(current)) {
        console.log(`[${timestamp}] Skipped: no active weekly schedule`);
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
