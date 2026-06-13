'use client';

import { useEffect, useMemo, useState } from 'react';

type ScheduleMode = 'now' | 'weekly';
type ScheduleStatus = 'No schedule active' | 'Schedule active' | 'Paused';
type BotStatus = 'Active' | 'Paused' | 'Inactive';

type BotSettings = {
  messageText: string;
  slackChannelId: string;
  scheduleMode: ScheduleMode;
  scheduleCron: string;
  scheduleDescription: string;
  scheduleStatus: ScheduleStatus;
  scheduleDayOfWeek: number;
  scheduleTime: string;
  status: BotStatus;
  hasSavedSettings: boolean;
  hasActiveSchedule: boolean;
  testSendEnabled: boolean;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  settings?: BotSettings;
};

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function describeSchedulePreview(dayOfWeek: number, time: string) {
  if (!time) {
    return '';
  }

  const day = DAYS[dayOfWeek] || 'Sunday';
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return '';
  }

  const hour12 = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';
  const minuteLabel = String(minute).padStart(2, '0');

  return `Every ${day} at ${hour12}:${minuteLabel} ${period}`;
}

function applySavedSettings(data: BotSettings) {
  return {
    messageText: data.messageText || '',
    slackChannelId: data.slackChannelId || '',
    scheduleMode: data.scheduleMode === 'weekly' ? ('weekly' as ScheduleMode) : ('now' as ScheduleMode),
    scheduleCron: data.scheduleCron || '',
    scheduleDayOfWeek: data.scheduleDayOfWeek ?? 0,
    scheduleTime: data.scheduleTime || '12:00',
    botStatus:
      data.status === 'Paused'
        ? ('Paused' as BotStatus)
        : data.status === 'Active'
          ? ('Active' as BotStatus)
          : ('Inactive' as BotStatus),
    scheduleStatus: data.scheduleStatus || 'No schedule active',
  };
}

export default function HomePage() {
  const [messageText, setMessageText] = useState('');
  const [slackChannelId, setSlackChannelId] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(0);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [useAdvancedCron, setUseAdvancedCron] = useState(false);
  const [scheduleCron, setScheduleCron] = useState('');
  const [weeklyStatus, setWeeklyStatus] = useState<BotStatus>('Active');
  const [savedScheduleStatus, setSavedScheduleStatus] =
    useState<ScheduleStatus>('No schedule active');
  const [secret, setSecret] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [loading, setLoading] = useState<'save' | 'send' | 'cancel' | null>(null);

  const schedulePreview = useMemo(() => {
    if (scheduleMode !== 'weekly') {
      return '';
    }

    if (useAdvancedCron && scheduleCron.trim()) {
      const parts = scheduleCron.trim().split(/\s+/);
      if (parts.length === 5) {
        const [minute, hour, , , dayOfWeek] = parts;
        const time = `${String(Number(hour)).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`;
        return describeSchedulePreview(Number(dayOfWeek), time);
      }
    }

    return describeSchedulePreview(scheduleDayOfWeek, scheduleTime);
  }, [
    scheduleMode,
    useAdvancedCron,
    scheduleCron,
    scheduleDayOfWeek,
    scheduleTime,
  ]);

  const canSendNow =
    Boolean(secret) && Boolean(messageText.trim()) && Boolean(slackChannelId.trim());

  const canSaveWeekly =
    Boolean(secret) &&
    Boolean(messageText.trim()) &&
    Boolean(slackChannelId.trim()) &&
    /^[CGDU]/i.test(slackChannelId.trim()) &&
    (useAdvancedCron ? Boolean(scheduleCron.trim()) : Boolean(scheduleTime));

  const canCancelSchedule =
    Boolean(secret) &&
    savedScheduleStatus !== 'No schedule active';

  function clearForm() {
    setMessageText('');
    setSlackChannelId('');
    setScheduleMode('now');
    setScheduleDayOfWeek(0);
    setScheduleTime('12:00');
    setUseAdvancedCron(false);
    setScheduleCron('');
    setWeeklyStatus('Active');
  }

  function loadSettingsIntoForm(data: BotSettings) {
    const applied = applySavedSettings(data);
    setMessageText(applied.messageText);
    setSlackChannelId(applied.slackChannelId);
    setScheduleMode(applied.scheduleMode);
    setScheduleDayOfWeek(applied.scheduleDayOfWeek);
    setScheduleTime(applied.scheduleTime);
    setScheduleCron(applied.scheduleCron);
    setWeeklyStatus(applied.botStatus);
    setSavedScheduleStatus(applied.scheduleStatus);
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: BotSettings) => {
        setControlsEnabled(Boolean(data.testSendEnabled));

        if (data.hasSavedSettings) {
          loadSettingsIntoForm(data);
        } else {
          setSavedScheduleStatus('No schedule active');
        }
      })
      .catch(() => setStatusMessage('Could not load bot settings.'));
  }, []);

  async function handleSaveWeeklySettings() {
    setLoading('save');
    setStatusMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          secret,
          messageText: messageText.trim(),
          slackChannelId: slackChannelId.trim(),
          scheduleMode: 'weekly',
          scheduleDayOfWeek,
          scheduleTime,
          useAdvancedCron,
          scheduleCron: useAdvancedCron ? scheduleCron.trim() : '',
          status: weeklyStatus,
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to save weekly settings.');
        return;
      }

      if (data.settings) {
        loadSettingsIntoForm(data.settings);
      }

      setStatusMessage('Weekly settings saved.');
    } catch {
      setStatusMessage('Network error while saving weekly settings.');
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelSchedule() {
    setLoading('cancel');
    setStatusMessage('');

    try {
      const response = await fetch('/api/settings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ secret }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to cancel schedule.');
        return;
      }

      if (data.settings) {
        loadSettingsIntoForm(data.settings);
        setScheduleMode('now');
        setScheduleDayOfWeek(0);
        setScheduleTime('12:00');
        setUseAdvancedCron(false);
        setScheduleCron('');
        setWeeklyStatus('Inactive');
      }

      setStatusMessage(data.message || 'Schedule cancelled.');
    } catch {
      setStatusMessage('Network error while cancelling schedule.');
    } finally {
      setLoading(null);
    }
  }

  async function handleSendNow() {
    setLoading('send');
    setStatusMessage('');

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          secret,
          messageText: messageText.trim(),
          slackChannelId: slackChannelId.trim(),
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to send message.');
        return;
      }

      clearForm();
      setStatusMessage('Message sent successfully.');
    } catch {
      setStatusMessage('Network error while sending message.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Magret Slack Bot</p>
        <h1>TechNest Slack Bot</h1>
        <p className="description">
          Send a message to a Slack channel now or on a weekly schedule.
        </p>

        <p className={`schedule-status schedule-status-${savedScheduleStatus.replace(/\s+/g, '-').toLowerCase()}`}>
          Schedule status: <strong>{savedScheduleStatus}</strong>
        </p>

        {controlsEnabled ? (
          <div className="settings-form">
            <label htmlFor="messageText">Message</label>
            <textarea
              id="messageText"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={4}
            />

            <label htmlFor="slackChannelId">Slack Destination ID</label>
            <input
              id="slackChannelId"
              type="text"
              value={slackChannelId}
              onChange={(event) => setSlackChannelId(event.target.value)}
            />
            <p className="note">
              <code>C</code> = public channel, <code>G</code> = private channel,{' '}
              <code>D</code> = DM conversation, <code>U</code> = Slack member ID.
              For channels, invite the bot with <code>/invite @YourBotName</code>.
            </p>

            <fieldset className="schedule-fieldset">
              <legend>Schedule</legend>
              <label className="radio-label">
                <input
                  type="radio"
                  name="scheduleMode"
                  value="now"
                  checked={scheduleMode === 'now'}
                  onChange={() => setScheduleMode('now')}
                />
                Send now
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="scheduleMode"
                  value="weekly"
                  checked={scheduleMode === 'weekly'}
                  onChange={() => setScheduleMode('weekly')}
                />
                Schedule weekly
              </label>
            </fieldset>

            {scheduleMode === 'weekly' ? (
              <div className="weekly-panel">
                <label htmlFor="scheduleDayOfWeek">Day of week</label>
                <select
                  id="scheduleDayOfWeek"
                  value={scheduleDayOfWeek}
                  onChange={(event) =>
                    setScheduleDayOfWeek(Number(event.target.value))
                  }
                  disabled={useAdvancedCron}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>

                <label htmlFor="scheduleTime">Time</label>
                <input
                  id="scheduleTime"
                  type="time"
                  value={scheduleTime}
                  onChange={(event) => setScheduleTime(event.target.value)}
                  disabled={useAdvancedCron}
                />

                {schedulePreview ? (
                  <p className="preview">
                    Schedule preview: <strong>{schedulePreview}</strong>
                  </p>
                ) : null}

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useAdvancedCron}
                    onChange={(event) => setUseAdvancedCron(event.target.checked)}
                  />
                  Advanced cron
                </label>

                {useAdvancedCron ? (
                  <>
                    <label htmlFor="scheduleCron">Cron expression</label>
                    <input
                      id="scheduleCron"
                      type="text"
                      value={scheduleCron}
                      onChange={(event) => setScheduleCron(event.target.value)}
                      placeholder="0 12 * * 0"
                    />
                  </>
                ) : null}

                <p className="note weekly-note">
                  Save weekly settings to activate this schedule. Send now does
                  not create a weekly schedule.
                </p>

                <label htmlFor="weeklyStatus">Weekly schedule status</label>
                <select
                  id="weeklyStatus"
                  value={weeklyStatus === 'Inactive' ? 'Paused' : weeklyStatus}
                  onChange={(event) =>
                    setWeeklyStatus(event.target.value as 'Active' | 'Paused')
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                </select>

                <div className="button-row weekly-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={loading !== null || !canSaveWeekly}
                    onClick={handleSaveWeeklySettings}
                  >
                    {loading === 'save' ? 'Saving…' : 'Save weekly settings'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={loading !== null || !canCancelSchedule}
                    onClick={handleCancelSchedule}
                  >
                    {loading === 'cancel' ? 'Cancelling…' : 'Cancel schedule'}
                  </button>
                </div>
              </div>
            ) : null}

            <label htmlFor="secret">API secret</label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Enter TEST_API_SECRET"
              autoComplete="off"
            />

            <div className="button-row">
              <button
                type="button"
                className="btn-primary"
                disabled={loading !== null || !canSendNow}
                onClick={handleSendNow}
              >
                {loading === 'send' ? 'Sending…' : 'Send now'}
              </button>
            </div>
          </div>
        ) : (
          <p className="note">
            Dashboard controls are disabled. Set <code>TEST_API_SECRET</code> in
            your environment.
          </p>
        )}

        {statusMessage ? <p className="status">{statusMessage}</p> : null}
      </section>
    </main>
  );
}
