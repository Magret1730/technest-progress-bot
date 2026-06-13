const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings');

const ERROR_MESSAGES = {
  not_in_channel:
    'The bot is not in this DM. Open the conversation and run /invite @YourBotName.',
  channel_not_found:
    'Channel not found. Check SLACK_CHANNEL_ID or SLACK_USER_ID in your environment.',
  invalid_auth: 'Invalid token. Check SLACK_BOT_TOKEN in your environment.',
  missing_scope:
    'Missing permission. Add chat:write and im:write scopes, then reinstall the app.',
  user_not_found: 'User not found. Check SLACK_USER_ID in your environment.',
};

function getSlackCredentials() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  const userId = process.env.SLACK_USER_ID;

  if (!token || token === 'xoxb-your-token-here') {
    throw new Error(
      'SLACK_BOT_TOKEN is missing. Copy .env.example to .env and add your bot token.'
    );
  }

  if (!channel && !userId) {
    throw new Error(
      'Set SLACK_USER_ID (recommended) or SLACK_CHANNEL_ID in your environment.'
    );
  }

  return { token, channel, userId };
}

async function sendHelloChan(options = {}) {
  const { token, channel, userId } = getSlackCredentials();
  const settings = await getSettings();
  const text = options.messageText ?? settings.messageText;
  const client = new WebClient(token);

  let targetChannel = channel;

  if (userId) {
    const dm = await client.conversations.open({ users: userId });
    targetChannel = dm.channel.id;
  }

  const result = await client.chat.postMessage({
    channel: targetChannel,
    text,
  });

  if (!result.ok) {
    const hint = ERROR_MESSAGES[result.error] || result.error;
    throw new Error(`Slack API error: ${hint}`);
  }

  return { channel: targetChannel, text, ts: result.ts };
}

function formatSlackError(error) {
  const slackError = error?.data?.error;
  if (slackError && ERROR_MESSAGES[slackError]) {
    return ERROR_MESSAGES[slackError];
  }
  return error.message;
}

module.exports = {
  sendHelloChan,
  getSlackCredentials,
  formatSlackError,
};
