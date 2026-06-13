require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { getSettings } = require('../lib/settings');
const { formatSlackError } = require('../lib/slack');

async function main() {
  const settings = await getSettings();

  console.log('Slack config check');
  console.log('------------------');

  if (!settings.hasSavedSettings) {
    console.error('No saved settings found. Save message and destination ID on the dashboard first.');
    process.exit(1);
  }

  console.log(`Destination ID: ${settings.slackChannelId}`);
  console.log(`Schedule mode: ${settings.scheduleMode}`);
  console.log(`Status: ${settings.status}`);

  if (!/^[CGD]/i.test(settings.slackChannelId)) {
    console.error('Destination ID must start with C, G, or D.');
    process.exit(1);
  }

  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const auth = await client.auth.test();
    console.log(`\nBot connected as @${auth.user} (${auth.user_id})`);

    const { sendMessage } = require('../lib/slack');
    const result = await sendMessage({
      messageText: 'Config check — you can ignore this message.',
      slackChannelId: settings.slackChannelId,
    });

    console.log(`\nMessage sent successfully to ${result.channel}`);
    console.log('Config looks good. Run: npm run send');
  } catch (error) {
    console.error(`\nError: ${formatSlackError(error)}`);
    console.log('\nMake sure the bot can reach the destination. For channels, invite the bot. For DMs, use an existing conversation ID.');
    process.exit(1);
  }
}

main();
