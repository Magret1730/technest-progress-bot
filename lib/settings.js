const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { describeCron } = require('./cron-utils');

const SETTINGS_KEY = 'bot-settings';
const LOCAL_PATH = path.join(process.cwd(), 'data', 'settings.json');

function usesKvStorage() {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

function getDefaultSettings() {
  return {
    messageText: process.env.MESSAGE_TEXT || 'Hello Chan',
    scheduleCron: process.env.SCHEDULE_CRON || '0 12 * * 0',
    status: process.env.BOT_STATUS || 'Active',
    destinationType: 'channel',
    slackChannelId: process.env.SLACK_CHANNEL_ID || '',
    slackUserId: process.env.SLACK_USER_ID || '',
  };
}

function validateSettings(input) {
  const messageText = String(input.messageText ?? '').trim();
  const scheduleCron = String(input.scheduleCron ?? '').trim();
  const status = input.status;
  const destinationType = input.destinationType === 'user' ? 'user' : 'channel';
  const slackChannelId = String(input.slackChannelId ?? '').trim();
  const slackUserId = String(input.slackUserId ?? '').trim();

  if (!messageText) {
    throw new Error('Message cannot be empty.');
  }

  if (!scheduleCron) {
    throw new Error('Cron expression cannot be empty.');
  }

  if (!cron.validate(scheduleCron)) {
    throw new Error('Cron expression is invalid.');
  }

  if (status !== 'Active' && status !== 'Paused') {
    throw new Error('Status must be Active or Paused.');
  }

  if (destinationType === 'channel' && !slackChannelId) {
    throw new Error('Channel ID cannot be empty when destination type is Channel.');
  }

  if (destinationType === 'user' && !slackUserId) {
    throw new Error('User ID cannot be empty when destination type is User.');
  }

  return {
    messageText,
    scheduleCron,
    status,
    destinationType,
    slackChannelId,
    slackUserId,
  };
}

async function readLocalSettings() {
  try {
    const raw = fs.readFileSync(LOCAL_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeLocalSettings(settings) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(settings, null, 2));
}

async function readKvSettings() {
  const { kv } = require('@vercel/kv');
  return kv.get(SETTINGS_KEY);
}

async function writeKvSettings(settings) {
  const { kv } = require('@vercel/kv');
  await kv.set(SETTINGS_KEY, settings);
}

async function readSavedSettings() {
  if (usesKvStorage()) {
    return readKvSettings();
  }

  return readLocalSettings();
}

async function writeSavedSettings(settings) {
  if (usesKvStorage()) {
    await writeKvSettings(settings);
    return;
  }

  await writeLocalSettings(settings);
}

async function getSettings() {
  const defaults = getDefaultSettings();
  const saved = await readSavedSettings();
  const settings = saved ? { ...defaults, ...saved } : defaults;

  return {
    appName: 'TechNest Slack Bot',
    description:
      'Sends weekly TechNest progress updates to Chan Meng on Slack.',
    messageText: settings.messageText,
    scheduleCron: settings.scheduleCron,
    scheduleDescription: describeCron(settings.scheduleCron),
    status: settings.status,
    destinationType: settings.destinationType === 'user' ? 'user' : 'channel',
    destinationLabel:
      settings.destinationType === 'user' ? 'User' : 'Channel',
    slackChannelId: settings.slackChannelId,
    slackUserId: settings.slackUserId,
    source: saved ? 'saved' : 'defaults',
    storage: usesKvStorage() ? 'kv' : 'file',
    testSendEnabled: Boolean(process.env.TEST_API_SECRET),
  };
}

async function saveSettings(input) {
  const validated = validateSettings(input);
  await writeSavedSettings(validated);
  return getSettings();
}

module.exports = {
  getDefaultSettings,
  validateSettings,
  getSettings,
  saveSettings,
  usesKvStorage,
};
