require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { getSettings } = require('../lib/settings');
const { formatSlackError } = require('../lib/slack');

async function main() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const settings = await getSettings();

  console.log('Slack config check');
  console.log('------------------');
  console.log(`Destination type: ${settings.destinationLabel}`);
  console.log(`SLACK_CHANNEL_ID (env): ${process.env.SLACK_CHANNEL_ID || '(not set)'}`);
  console.log(`SLACK_USER_ID (env): ${process.env.SLACK_USER_ID || '(not set)'}`);
  console.log(`Saved channel ID: ${settings.slackChannelId || '(not set)'}`);
  console.log(`Saved user ID: ${settings.slackUserId || '(not set)'}`);

  try {
    const auth = await client.auth.test();
    console.log(`\nBot connected as @${auth.user} (${auth.user_id})`);

    const { sendHelloChan } = require('../lib/slack');
    const result = await sendHelloChan({
      messageText: 'Config check — you can ignore this message.',
    });

    console.log(`\nMessage sent successfully to ${result.channel}`);
    console.log('Config looks good. Run: npm run send');
  } catch (error) {
    console.error(`\nError: ${formatSlackError(error)}`);

    if (settings.destinationType === 'channel') {
      console.log('\nChannel setup tips:');
      console.log('  1. Open the target channel in Slack');
      console.log('  2. Run /invite @YourBotName');
      console.log('  3. Confirm SLACK_CHANNEL_ID matches the channel ID');
    }

    process.exit(1);
  }
}

main();
