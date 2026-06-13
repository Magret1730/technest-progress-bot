require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { getSettings } = require('../lib/settings');
const { formatSlackError } = require('../lib/slack');

async function main() {
  const settings = await getSettings();

  console.log('Slack config check');
  console.log('------------------');

  if (!settings.hasSavedSettings) {
    console.error('No saved settings found. Save message and channel ID on the dashboard first.');
    process.exit(1);
  }

  console.log(`Channel ID: ${settings.slackChannelId}`);
  console.log(`Schedule mode: ${settings.scheduleMode}`);
  console.log(`Status: ${settings.status}`);

  if (!/^[CG]/i.test(settings.slackChannelId)) {
    console.error('Channel ID must start with C or G.');
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
    console.log('\nMake sure the bot has been invited to the channel.');
    process.exit(1);
  }
}

main();
