const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings');

const DESTINATION_ID_PATTERN = /^[CGDU]/i;

const ERROR_MESSAGES = {
  not_in_channel:
    'The bot is not in this channel. Invite it with /invite @YourBotName.',
  channel_not_found:
    'Destination not found. Check the ID. For channels, invite the bot. For DMs, use an existing conversation ID.',
  user_not_found: 'Member not found. Check the Slack member ID.',
  invalid_auth: 'Invalid token. Check SLACK_BOT_TOKEN in your environment.',
  missing_scope:
    'Missing permission. Add chat:write (and im:write for member IDs) to your Slack app, then reinstall.',
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

function validateDestinationId(destinationId) {
  const destination = String(destinationId ?? '').trim();

  if (!destination) {
    throw new Error('Slack destination ID is required.');
  }

  if (!DESTINATION_ID_PATTERN.test(destination)) {
    throw new Error('Destination ID must start with C, G, D, or U.');
  }

  return destination;
}

async function resolvePostChannel(client, destinationId) {
  const destination = validateDestinationId(destinationId);

  if (/^[CGD]/i.test(destination)) {
    return destination;
  }

  const openResult = await client.conversations.open({ users: destination });

  if (!openResult.ok || !openResult.channel?.id) {
    const hint =
      ERROR_MESSAGES[openResult.error] ||
      'Could not open a DM with that member. Check the member ID.';
    throw new Error(hint);
  }

  return openResult.channel.id;
}

async function sendMessage(options = {}) {
  const hasFormValues =
    options.messageText !== undefined || options.slackChannelId !== undefined;

  let text;
  let destinationId;

  if (hasFormValues) {
    text = options.messageText;
    destinationId = options.slackChannelId;
  } else {
    const settings = await getSettings();

    if (!settings.hasSavedSettings) {
      throw new Error(
        'No saved weekly settings found. Save weekly settings on the dashboard first.'
      );
    }

    text = settings.messageText;
    destinationId = settings.slackChannelId;
  }

  if (!text?.trim()) {
    throw new Error('Message is required.');
  }

  const destination = validateDestinationId(destinationId);
  const { token } = getSlackCredentials();
  const client = new WebClient(token);

  try {
    const channel = await resolvePostChannel(client, destination);
    const result = await client.chat.postMessage({
      channel,
      text: text.trim(),
    });

    if (!result.ok) {
      const hint = ERROR_MESSAGES[result.error] || result.error;
      throw new Error(`Slack API error: ${hint}`);
    }

    return { channel, text: text.trim(), ts: result.ts };
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
  validateDestinationId,
  DESTINATION_ID_PATTERN,
};
