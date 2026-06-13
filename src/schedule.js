require('dotenv').config();

const cron = require('node-cron');
const { sendHelloChan, getConfig, formatSlackError } = require('../lib/slack');

const DEFAULT_CRON = '0 12 * * 0';
const expression = process.env.SCHEDULE_CRON || DEFAULT_CRON;

if (!cron.validate(expression)) {
  console.error(`Invalid SCHEDULE_CRON: "${expression}"`);
  console.error('Example for Sunday 12:00 PM: 0 12 * * 0');
  process.exit(1);
}

const { text, channel, userId } = getConfig();

console.log('Slack weekly scheduler running.');
console.log(`Message: "${text}"`);
console.log(`Target: ${userId ? `user ${userId}` : `channel ${channel}`}`);
console.log(`Schedule: ${expression} (local time)`);
console.log('Press Ctrl+C to stop.\n');

cron.schedule(expression, async () => {
  const timestamp = new Date().toLocaleString();
  try {
    const result = await sendHelloChan();
    console.log(`[${timestamp}] Sent "${result.text}" to ${result.channel}`);
  } catch (error) {
    console.error(`[${timestamp}] Failed: ${formatSlackError(error)}`);
  }
});
