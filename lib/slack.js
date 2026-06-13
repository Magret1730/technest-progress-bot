const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings');

const ERROR_MESSAGES = {
  not_in_channel:
    'The bot is not in this channel. Invite it with /invite @YourBotName or add the app to the channel.',
  channel_not_found:
    'Channel not found. Check the channel ID and make sure the bot has been added to that channel.',
  invalid_auth: 'Invalid token. Check SLACK_BOT_TOKEN in your environment.',
  missing_scope:
    'Missing permission. Add chat:write, groups:write, and channels:manage to your Slack app, then reinstall.',
  user_not_found:
    'User not found. Check the user ID — it should start with U.',
  missing_channel_id:
    'No channel ID configured. Set SLACK_CHANNEL_ID in .env or save a channel ID on the dashboard.',
  missing_user_id:
    'No user ID configured. Set SLACK_USER_ID in .env or save a user ID on the dashboard.',
  name_taken:
    'That channel name is already taken. Choose a different name.',
  invalid_name:
    'Invalid channel name. Use lowercase letters, numbers, hyphens, and underscores only (example: chan-progress-updates).',
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

function normalizeChannelName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function validateChannelName(name) {
  const normalized = normalizeChannelName(name);

  if (!normalized) {
    throw new Error('Channel name cannot be empty.');
  }

  if (normalized.length > 80) {
    throw new Error('Channel name must be 80 characters or fewer.');
  }

  if (!/^[a-z0-9-_]+$/.test(normalized)) {
    throw new Error(ERROR_MESSAGES.invalid_name);
  }

  return normalized;
}

async function ensureBotInChannel(client, channelId) {
  try {
    await client.conversations.join({ channel: channelId });
  } catch (error) {
    const slackError = error?.data?.error;
    if (slackError && slackError !== 'already_in_channel') {
      throw error;
    }
  }
}

async function createPrivateChannel(channelName) {
  const { token } = getSlackCredentials();
  const client = new WebClient(token);
  const name = validateChannelName(channelName);

  try {
    const result = await client.conversations.create({
      name,
      is_private: true,
    });

    const channelId = result.channel?.id;

    if (!channelId) {
      throw new Error('Channel was created but no channel ID was returned.');
    }

    await ensureBotInChannel(client, channelId);

    return {
      channelId,
      channelName: result.channel?.name || name,
      isPrivate: true,
    };
  } catch (error) {
    const slackError = error?.data?.error;

    if (slackError && ERROR_MESSAGES[slackError]) {
      throw new Error(ERROR_MESSAGES[slackError]);
    }

    if (error.message && Object.values(ERROR_MESSAGES).includes(error.message)) {
      throw error;
    }

    throw new Error(formatSlackError(error));
  }
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
  createPrivateChannel,
  validateChannelName,
  getSlackCredentials,
  formatSlackError,
};
