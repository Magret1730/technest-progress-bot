const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings');

const ERROR_MESSAGES = {
  not_in_channel:
    'The bot is not in this channel. Invite it with /invite @YourBotName or add the app to the channel.',
  channel_not_found:
    'Channel not found. Check the channel ID and make sure the bot has been added to that channel.',
  invalid_auth: 'Invalid token. Check SLACK_BOT_TOKEN in your environment.',
  missing_scope:
    'Missing permission. Add chat:write (and channels:join if needed), then reinstall the app.',
  user_not_found:
    'User not found. Check the user ID — it should start with U.',
  missing_channel_id:
    'No channel ID configured. Set SLACK_CHANNEL_ID in .env or save a channel ID on the dashboard.',
  missing_user_id:
    'No user ID configured. Set SLACK_USER_ID in .env or save a user ID on the dashboard.',
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

async function resolveTargetChannel(client, settings) {
  const destinationType = settings.destinationType === 'user' ? 'user' : 'channel';

  if (destinationType === 'user') {
    const userId = settings.slackUserId || process.env.SLACK_USER_ID;

    if (!userId) {
      throw new Error(ERROR_MESSAGES.missing_user_id);
    }

    const dm = await client.conversations.open({ users: userId });

    if (!dm.channel?.id) {
      throw new Error('Could not open a DM with the configured user ID.');
    }

    return dm.channel.id;
  }

  const channelId = settings.slackChannelId || process.env.SLACK_CHANNEL_ID;

  if (!channelId) {
    throw new Error(ERROR_MESSAGES.missing_channel_id);
  }

  return channelId;
}

async function sendHelloChan(options = {}) {
  const { token } = getSlackCredentials();
  const settings = await getSettings();
  const text = options.messageText ?? settings.messageText;
  const client = new WebClient(token);

  let targetChannel;

  try {
    targetChannel = await resolveTargetChannel(client, settings);
  } catch (error) {
    const slackError = error?.data?.error;
    if (slackError && ERROR_MESSAGES[slackError]) {
      throw new Error(ERROR_MESSAGES[slackError]);
    }
    throw error;
  }

  try {
    const result = await client.chat.postMessage({
      channel: targetChannel,
      text,
    });

    if (!result.ok) {
      const hint = ERROR_MESSAGES[result.error] || result.error;
      throw new Error(`Slack API error: ${hint}`);
    }

    return { channel: targetChannel, text, ts: result.ts };
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
  sendHelloChan,
  getSlackCredentials,
  formatSlackError,
};
