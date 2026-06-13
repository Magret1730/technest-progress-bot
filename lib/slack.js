const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings');

const ERROR_MESSAGES = {
  not_in_channel:
    'The bot is not in this channel. Invite it with /invite @YourBotName.',
  channel_not_found:
    'Channel not found. Check the channel ID and make sure the bot has been added.',
  invalid_auth: 'Invalid token. Check SLACK_BOT_TOKEN in your environment.',
  missing_scope:
    'Missing permission. Add chat:write to your Slack app, then reinstall.',
};

function getSlackCredentials() {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token || token === 'xoxb-your-token-here') {
    throw new Error(
      'SLACK_BOT_TOKEN is missing. Copy .env.example to .env and add your bot token.'
    );
  }

  return { token };
}

async function sendMessage(options = {}) {
  const settings = await getSettings();
  const text = options.messageText ?? settings.messageText;
  const channel = options.slackChannelId ?? settings.slackChannelId;

  if (!text?.trim()) {
    throw new Error('Message is required.');
  }

  if (!channel?.trim()) {
    throw new Error('Channel ID is required.');
  }

  if (!/^[CG]/i.test(channel.trim())) {
    throw new Error('Channel ID must start with C or G.');
  }

  const { token } = getSlackCredentials();
  const client = new WebClient(token);

  try {
    const result = await client.chat.postMessage({
      channel: channel.trim(),
      text: text.trim(),
    });

    if (!result.ok) {
      const hint = ERROR_MESSAGES[result.error] || result.error;
      throw new Error(`Slack API error: ${hint}`);
    }

    return { channel: channel.trim(), text: text.trim(), ts: result.ts };
  } catch (error) {
    const slackError = error?.data?.error;
    if (slackError && ERROR_MESSAGES[slackError]) {
      throw new Error(ERROR_MESSAGES[slackError]);
    }
    throw error;
  }
}

function formatSlackError(error) {
  const slackError = error?.data?.error;
  if (slackError && ERROR_MESSAGES[slackError]) {
    return ERROR_MESSAGES[slackError];
  }
  return error.message;
}

module.exports = {
  sendMessage,
  getSlackCredentials,
  formatSlackError,
};
