const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const {
  describeCron,
  parseCron,
  buildCronFromDayAndTime,
  isValidCron,
} = require('./cron-utils');

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

function resolveWeeklyCron(input) {
  const useAdvancedCron = Boolean(input.useAdvancedCron);
  const scheduleCron = String(input.scheduleCron ?? '').trim();

  if (useAdvancedCron) {
    if (!scheduleCron) {
      throw new Error('Cron expression is required for weekly schedule.');
    }

    if (!isValidCron(scheduleCron)) {
      throw new Error('Invalid cron expression.');
    }

    return scheduleCron;
  }

  return buildCronFromDayAndTime(input.scheduleDayOfWeek, input.scheduleTime);
}

function validateSettings(input) {
  const messageText = String(input.messageText ?? '').trim();
  const slackChannelId = validateChannelId(input.slackChannelId);
  const scheduleMode = input.scheduleMode === 'weekly' ? 'weekly' : 'now';
  const status =
    input.status === 'Paused'
      ? 'Paused'
      : input.status === 'Inactive'
        ? 'Inactive'
        : 'Active';

  if (!messageText) {
    throw new Error('Message is required.');
  }

  let scheduleCron = '';

  if (scheduleMode === 'weekly') {
    scheduleCron = resolveWeeklyCron(input);
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

function getScheduleStatus(saved) {
  if (
    !saved ||
    saved.scheduleMode !== 'weekly' ||
    !String(saved.scheduleCron ?? '').trim()
  ) {
    return 'No schedule active';
  }

  if (saved.status === 'Active') {
    return 'Schedule active';
  }

  if (saved.status === 'Paused') {
    return 'Paused';
  }

  return 'No schedule active';
}

function isScheduleSendEnabled(saved) {
  return (
    saved &&
    saved.scheduleMode === 'weekly' &&
    Boolean(String(saved.scheduleCron ?? '').trim()) &&
    saved.status === 'Active'
  );
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

function buildSettingsResponse(saved) {
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
      scheduleStatus: 'No schedule active',
      scheduleDayOfWeek: 0,
      scheduleTime: '12:00',
      status: 'Inactive',
      hasSavedSettings: false,
      hasActiveSchedule: false,
      storage: usesKvStorage() ? 'kv' : 'file',
      testSendEnabled: Boolean(process.env.TEST_API_SECRET),
    };
  }

  const scheduleMode = saved.scheduleMode === 'weekly' ? 'weekly' : 'now';
  const scheduleCron = saved.scheduleCron || '';
  const parsed = parseCron(scheduleCron);

  return {
    appName: 'TechNest Slack Bot',
    description:
      'Send messages to a Slack channel on a schedule or on demand.',
    messageText: saved.messageText || '',
    slackChannelId: saved.slackChannelId || '',
    scheduleMode,
    scheduleCron,
    scheduleDescription: scheduleCron ? describeCron(scheduleCron) : '',
    scheduleStatus: getScheduleStatus(saved),
    scheduleDayOfWeek: parsed?.dayOfWeek ?? 0,
    scheduleTime: parsed?.time ?? '12:00',
    status: saved.status || 'Inactive',
    hasSavedSettings: true,
    hasActiveSchedule: isScheduleSendEnabled(saved),
    storage: usesKvStorage() ? 'kv' : 'file',
    testSendEnabled: Boolean(process.env.TEST_API_SECRET),
  };
}

async function getSettings() {
  const saved = await readSavedSettings();
  return buildSettingsResponse(saved);
}

async function saveSettings(input) {
  const validated = validateSettings(input);
  await writeSavedSettings(validated);
  return getSettings();
}

async function cancelSchedule() {
  const saved = (await readSavedSettings()) || {};

  await writeSavedSettings({
    messageText: saved.messageText || '',
    slackChannelId: saved.slackChannelId || '',
    scheduleMode: 'now',
    scheduleCron: '',
    status: 'Inactive',
  });

  return getSettings();
}

module.exports = {
  validateSettings,
  validateSendInput,
  getSettings,
  saveSettings,
  cancelSchedule,
  isScheduleSendEnabled,
  getScheduleStatus,
  usesKvStorage,
};
