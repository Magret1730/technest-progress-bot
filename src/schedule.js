require('dotenv').config();

const cron = require('node-cron');
const { sendHelloChan, formatSlackError } = require('../lib/slack');
const { getSettings } = require('../lib/settings');

async function startScheduler() {
  const settings = await getSettings();

  if (!cron.validate(settings.scheduleCron)) {
    console.error(`Invalid schedule cron: "${settings.scheduleCron}"`);
    process.exit(1);
  }

  console.log('Slack weekly scheduler running.');
  console.log(`Message: "${settings.messageText}"`);
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

      const result = await sendHelloChan();
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
