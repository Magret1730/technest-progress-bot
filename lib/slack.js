const { WebClient } = require('@slack/web-api');

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

function getConfig() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  const userId = process.env.SLACK_USER_ID;
  const text = process.env.MESSAGE_TEXT || 'Hello Chan';

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

  return { token, channel, userId, text };
}

async function sendHelloChan() {
  const { token, channel, userId, text } = getConfig();
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

function getPublicConfig() {
  const scheduleCron = process.env.SCHEDULE_CRON || '0 12 * * 0';
  return {
    appName: 'TechNest Slack Bot',
    description:
      'Sends weekly TechNest progress updates to Chan Meng on Slack.',
    messageText: process.env.MESSAGE_TEXT || 'Hello Chan',
    scheduleCron,
    scheduleDescription: describeCron(scheduleCron),
    testSendEnabled: Boolean(process.env.TEST_API_SECRET),
  };
}

function describeCron(expression) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return expression;
  }

  const [minute, hour, , , dayOfWeek] = parts;
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const day = days[Number(dayOfWeek)] || `day ${dayOfWeek}`;
  const hourNum = Number(hour);
  const minuteNum = Number(minute);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 || 12;
  const minuteLabel = String(minuteNum).padStart(2, '0');

  return `Every ${day} at ${hour12}:${minuteLabel} ${period}`;
}

module.exports = {
  sendHelloChan,
  getConfig,
  formatSlackError,
  getPublicConfig,
  describeCron,
};
