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

function validateChannelId(channelId) {
  const value = String(channelId ?? '').trim();

  if (!value) {
    throw new Error('Channel ID is required.');
  }

  if (!/^[CG]/i.test(value)) {
    throw new Error('Channel ID must start with C or G.');
  }

  return value;
}

function validateSettings(input) {
  const messageText = String(input.messageText ?? '').trim();
  const slackChannelId = validateChannelId(input.slackChannelId);
  const scheduleMode = input.scheduleMode === 'weekly' ? 'weekly' : 'now';
  const scheduleCron = String(input.scheduleCron ?? '').trim();
  const status = input.status === 'Paused' ? 'Paused' : 'Active';

  if (!messageText) {
    throw new Error('Message is required.');
  }

  if (scheduleMode === 'weekly') {
    if (!scheduleCron) {
      throw new Error('Cron expression is required for weekly schedule.');
    }

    if (!cron.validate(scheduleCron)) {
      throw new Error('Cron expression is invalid.');
    }
  }

  return {
    messageText,
    slackChannelId,
    scheduleMode,
    scheduleCron,
    status,
  };
}

function validateSendInput(input) {
  const messageText = String(input.messageText ?? '').trim();
  const slackChannelId = validateChannelId(input.slackChannelId);

  if (!messageText) {
    throw new Error('Message is required.');
  }

  return { messageText, slackChannelId };
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
  const saved = await readSavedSettings();

  if (!saved) {
    return {
      appName: 'TechNest Slack Bot',
      description:
        'Send messages to a Slack channel on a schedule or on demand.',
      messageText: '',
      slackChannelId: '',
      scheduleMode: 'now',
      scheduleCron: '',
      scheduleDescription: '',
      status: 'Active',
      hasSavedSettings: false,
      storage: usesKvStorage() ? 'kv' : 'file',
      testSendEnabled: Boolean(process.env.TEST_API_SECRET),
    };
  }

  const scheduleMode = saved.scheduleMode === 'weekly' ? 'weekly' : 'now';
  const scheduleCron = saved.scheduleCron || '';

  return {
    appName: 'TechNest Slack Bot',
    description:
      'Send messages to a Slack channel on a schedule or on demand.',
    messageText: saved.messageText || '',
    slackChannelId: saved.slackChannelId || '',
    scheduleMode,
    scheduleCron,
    scheduleDescription: scheduleCron ? describeCron(scheduleCron) : '',
    status: saved.status === 'Paused' ? 'Paused' : 'Active',
    hasSavedSettings: true,
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
  validateSettings,
  validateSendInput,
  getSettings,
  saveSettings,
  usesKvStorage,
};
