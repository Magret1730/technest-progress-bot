'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ScheduleMode = 'now' | 'weekly';

type BotSettings = {
  messageText: string;
  slackChannelId: string;
  scheduleMode: ScheduleMode;
  scheduleCron: string;
  status: 'Active' | 'Paused';
  hasSavedSettings: boolean;
  testSendEnabled: boolean;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  text?: string;
  channel?: string;
};

function describeCronClient(expression: string) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return '';
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

export default function HomePage() {
  const [messageText, setMessageText] = useState('');
  const [slackChannelId, setSlackChannelId] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [scheduleCron, setScheduleCron] = useState('');
  const [botStatus, setBotStatus] = useState<'Active' | 'Paused'>('Active');
  const [secret, setSecret] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [loading, setLoading] = useState<'save' | 'send' | null>(null);

  const schedulePreview = useMemo(() => {
    if (scheduleMode !== 'weekly' || !scheduleCron.trim()) {
      return '';
    }

    return describeCronClient(scheduleCron);
  }, [scheduleMode, scheduleCron]);

  const canSendNow =
    Boolean(secret) && Boolean(messageText.trim()) && Boolean(slackChannelId.trim());

  function clearForm() {
    setMessageText('');
    setSlackChannelId('');
    setScheduleMode('now');
    setScheduleCron('');
    setBotStatus('Active');
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: BotSettings) => {
        setControlsEnabled(Boolean(data.testSendEnabled));

        if (!data.hasSavedSettings) {
          return;
        }

        setMessageText(data.messageText || '');
        setSlackChannelId(data.slackChannelId || '');
        setScheduleMode(data.scheduleMode === 'weekly' ? 'weekly' : 'now');
        setScheduleCron(data.scheduleCron || '');
        setBotStatus(data.status === 'Paused' ? 'Paused' : 'Active');
      })
      .catch(() => setStatusMessage('Could not load bot settings.'));
  }, []);

  async function handleSaveWeeklySettings(event: FormEvent) {
    event.preventDefault();
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
          messageText,
          slackChannelId,
          scheduleMode: 'weekly',
          scheduleCron,
          status: botStatus,
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to save weekly settings.');
        return;
      }

      setStatusMessage('Weekly settings saved.');
    } catch {
      setStatusMessage('Network error while saving weekly settings.');
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
        <p className="eyebrow">Technest Community</p>
        <h1>TechNest Slack Bot</h1>
        <p className="description">
          Send a message to a Slack channel now or on a weekly schedule.
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

            <label htmlFor="slackChannelId">Slack channel ID</label>
            <input
              id="slackChannelId"
              type="text"
              value={slackChannelId}
              onChange={(event) => setSlackChannelId(event.target.value)}
            />
            <p className="note">
              Channel IDs usually start with <code>C</code> or <code>G</code>.
              The bot must be invited to the channel.
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
              <form onSubmit={handleSaveWeeklySettings}>
                <label htmlFor="scheduleCron">Cron expression</label>
                <input
                  id="scheduleCron"
                  type="text"
                  value={scheduleCron}
                  onChange={(event) => setScheduleCron(event.target.value)}
                  placeholder="0 12 * * 0"
                  required
                />
                {schedulePreview ? (
                  <p className="preview">
                    Schedule preview: <strong>{schedulePreview}</strong>
                  </p>
                ) : (
                  <p className="note">
                    Example preview: Every Sunday at 12:00 PM
                  </p>
                )}

                <p className="note weekly-note">
                  Save settings to activate this weekly schedule.
                </p>

                <label htmlFor="botStatus">Status</label>
                <select
                  id="botStatus"
                  value={botStatus}
                  onChange={(event) =>
                    setBotStatus(event.target.value as 'Active' | 'Paused')
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                </select>

                <button type="submit" disabled={loading !== null || !secret}>
                  {loading === 'save' ? 'Saving…' : 'Save weekly settings'}
                </button>
              </form>
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
