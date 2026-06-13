'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type BotSettings = {
  appName: string;
  description: string;
  messageText: string;
  scheduleCron: string;
  scheduleDescription: string;
  status: 'Active' | 'Paused';
  source: 'saved' | 'defaults';
  storage: 'kv' | 'file';
  testSendEnabled: boolean;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  text?: string;
  channel?: string;
  settings?: BotSettings;
};

function describeCronClient(expression: string) {
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

export default function HomePage() {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [messageText, setMessageText] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [botStatus, setBotStatus] = useState<'Active' | 'Paused'>('Active');
  const [secret, setSecret] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState<'save' | 'send' | null>(null);
  const [health, setHealth] = useState('checking');

  const scheduleDescription = useMemo(
    () => describeCronClient(scheduleCron || '0 12 * * 0'),
    [scheduleCron]
  );

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: BotSettings) => {
        setSettings(data);
        setMessageText(data.messageText);
        setScheduleCron(data.scheduleCron);
        setBotStatus(data.status);
      })
      .catch(() => setStatusMessage('Could not load bot settings.'));

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status === 'ok' ? 'live' : 'unknown'))
      .catch(() => setHealth('offline'));
  }, []);

  async function handleSaveSettings(event: FormEvent) {
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
          scheduleCron,
          status: botStatus,
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to save settings.');
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
        setMessageText(data.settings.messageText);
        setScheduleCron(data.settings.scheduleCron);
        setBotStatus(data.settings.status);
      }

      setStatusMessage('Settings saved.');
    } catch {
      setStatusMessage('Network error while saving settings.');
    } finally {
      setLoading(null);
    }
  }

  async function handleTestSend(event: FormEvent) {
    event.preventDefault();
    setLoading('send');
    setStatusMessage('');

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ secret, messageText }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to send test message.');
        return;
      }

      setStatusMessage(`Sent "${data.text}" to Slack channel ${data.channel}.`);
    } catch {
      setStatusMessage('Network error while sending test message.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Technest Community</p>
        <h1>{settings?.appName || 'TechNest Slack Bot'}</h1>
        <p className="description">
          {settings?.description ||
            'Sends weekly TechNest progress updates to Chan Meng on Slack.'}
        </p>

        <dl className="meta">
          <div>
            <dt>App health</dt>
            <dd className={health}>{health}</dd>
          </div>
          <div>
            <dt>Bot status</dt>
            <dd className={botStatus === 'Active' ? 'active' : 'paused'}>
              {botStatus}
            </dd>
          </div>
          <div>
            <dt>Schedule preview</dt>
            <dd>{scheduleDescription}</dd>
          </div>
          <div>
            <dt>Settings source</dt>
            <dd>{settings?.source === 'saved' ? 'Saved settings' : 'Environment defaults'}</dd>
          </div>
        </dl>

        {settings?.testSendEnabled ? (
          <form className="settings-form" onSubmit={handleSaveSettings}>
            <label htmlFor="messageText">Weekly message</label>
            <textarea
              id="messageText"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={3}
              required
            />

            <label htmlFor="scheduleCron">Schedule cron expression</label>
            <input
              id="scheduleCron"
              type="text"
              value={scheduleCron}
              onChange={(event) => setScheduleCron(event.target.value)}
              placeholder="0 12 * * 0"
              required
            />

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

            <label htmlFor="secret">API secret</label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Enter TEST_API_SECRET"
              autoComplete="off"
              required
            />

            <div className="button-row">
              <button type="submit" disabled={loading !== null || !secret}>
                {loading === 'save' ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={loading !== null || !secret || !messageText.trim()}
                onClick={handleTestSend}
              >
                {loading === 'send' ? 'Sending…' : 'Send test message'}
              </button>
            </div>
          </form>
        ) : (
          <p className="note">
            Dashboard controls are disabled. Set <code>TEST_API_SECRET</code> in
            your environment to enable save and test actions.
          </p>
        )}

        {statusMessage ? <p className="status">{statusMessage}</p> : null}
      </section>
    </main>
  );
}
