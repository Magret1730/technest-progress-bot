'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type DestinationType = 'channel' | 'user';

type BotSettings = {
  appName: string;
  description: string;
  messageText: string;
  scheduleCron: string;
  scheduleDescription: string;
  status: 'Active' | 'Paused';
  destinationType: DestinationType;
  destinationLabel: string;
  slackChannelId: string;
  slackUserId: string;
  source: 'saved' | 'defaults';
  storage: 'kv' | 'file';
  testSendEnabled: boolean;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  text?: string;
  channel?: string;
  channelId?: string;
  channelName?: string;
  instructions?: string;
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

function applySettings(
  data: BotSettings,
  setters: {
    setSettings: (value: BotSettings) => void;
    setMessageText: (value: string) => void;
    setScheduleCron: (value: string) => void;
    setBotStatus: (value: 'Active' | 'Paused') => void;
    setDestinationType: (value: DestinationType) => void;
    setSlackChannelId: (value: string) => void;
    setSlackUserId: (value: string) => void;
  }
) {
  setters.setSettings(data);
  setters.setMessageText(data.messageText);
  setters.setScheduleCron(data.scheduleCron);
  setters.setBotStatus(data.status);
  setters.setDestinationType(data.destinationType || 'channel');
  setters.setSlackChannelId(data.slackChannelId || '');
  setters.setSlackUserId(data.slackUserId || '');
}

export default function HomePage() {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [messageText, setMessageText] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [botStatus, setBotStatus] = useState<'Active' | 'Paused'>('Active');
  const [destinationType, setDestinationType] =
    useState<DestinationType>('channel');
  const [slackChannelId, setSlackChannelId] = useState('');
  const [slackUserId, setSlackUserId] = useState('');
  const [newChannelName, setNewChannelName] = useState('chan-progress-updates');
  const [secret, setSecret] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [channelInstructions, setChannelInstructions] = useState('');
  const [loading, setLoading] = useState<'save' | 'send' | 'create' | null>(
    null
  );
  const [health, setHealth] = useState('checking');

  const scheduleDescription = useMemo(
    () => describeCronClient(scheduleCron || '0 12 * * 0'),
    [scheduleCron]
  );

  const destinationSummary = useMemo(() => {
    if (destinationType === 'user') {
      return slackUserId ? `User ${slackUserId}` : 'User (not set)';
    }

    return slackChannelId ? `Channel ${slackChannelId}` : 'Channel (not set)';
  }, [destinationType, slackChannelId, slackUserId]);

  const settingSetters = {
    setSettings,
    setMessageText,
    setScheduleCron,
    setBotStatus,
    setDestinationType,
    setSlackChannelId,
    setSlackUserId,
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: BotSettings) => applySettings(data, settingSetters))
      .catch(() => setStatusMessage('Could not load bot settings.'));

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status === 'ok' ? 'live' : 'unknown'))
      .catch(() => setHealth('offline'));
  }, []);

  async function handleCreateChannel(event: FormEvent) {
    event.preventDefault();
    setLoading('create');
    setStatusMessage('');
    setChannelInstructions('');

    try {
      const response = await fetch('/api/channels/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          secret,
          channelName: newChannelName,
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to create channel.');
        return;
      }

      if (data.settings) {
        applySettings(data.settings, settingSetters);
      }

      setStatusMessage(
        `Created private channel #${data.channelName} (${data.channelId}).`
      );
      setChannelInstructions(
        data.instructions ||
          'Invite Chan Meng manually in Slack with /invite or Add people.'
      );
    } catch {
      setStatusMessage('Network error while creating channel.');
    } finally {
      setLoading(null);
    }
  }

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault();
    setLoading('save');
    setStatusMessage('');
    setChannelInstructions('');

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
          destinationType,
          slackChannelId,
          slackUserId,
        }),
      });

      const data: ActionResult = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error || 'Failed to save settings.');
        return;
      }

      if (data.settings) {
        applySettings(data.settings, settingSetters);
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
    setChannelInstructions('');

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
            <dt>Destination</dt>
            <dd>{destinationSummary}</dd>
          </div>
          <div>
            <dt>Schedule preview</dt>
            <dd>{scheduleDescription}</dd>
          </div>
          <div>
            <dt>Settings source</dt>
            <dd>
              {settings?.source === 'saved'
                ? 'Saved settings'
                : 'Environment defaults'}
            </dd>
          </div>
        </dl>

        {settings?.testSendEnabled ? (
          <>
            <div className="settings-form shared-secret">
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
            </div>

            <section className="panel">
              <h2>Create private channel</h2>
              <p className="note">
                Creates a new private Slack channel via the server-side API,
                saves its ID as the delivery destination, and adds the bot
                automatically.
              </p>

              <form className="settings-form" onSubmit={handleCreateChannel}>
                <label htmlFor="newChannelName">Channel name</label>
                <input
                  id="newChannelName"
                  type="text"
                  value={newChannelName}
                  onChange={(event) => setNewChannelName(event.target.value)}
                  placeholder="chan-progress-updates"
                  required
                />

                <p className="note">
                  After creation, invite <strong>Chan Meng</strong> manually in
                  Slack with <code>/invite @chan</code> or{' '}
                  <strong>Add people</strong>, unless your app has user-invite
                  permissions.
                </p>

                <button
                  type="submit"
                  disabled={loading !== null || !secret || !newChannelName.trim()}
                >
                  {loading === 'create'
                    ? 'Creating…'
                    : 'Create private channel'}
                </button>
              </form>
            </section>

            <form className="settings-form" onSubmit={handleSaveSettings}>
              <label htmlFor="destinationType">Destination type</label>
              <select
                id="destinationType"
                value={destinationType}
                onChange={(event) =>
                  setDestinationType(event.target.value as DestinationType)
                }
              >
                <option value="channel">Channel</option>
                <option value="user">User</option>
              </select>

              {destinationType === 'channel' ? (
                <>
                  <label htmlFor="slackChannelId">Channel ID</label>
                  <input
                    id="slackChannelId"
                    type="text"
                    value={slackChannelId}
                    onChange={(event) => setSlackChannelId(event.target.value)}
                    placeholder="C1234567890 or G0123456789"
                    required
                  />
                </>
              ) : (
                <>
                  <label htmlFor="slackUserId">User ID</label>
                  <input
                    id="slackUserId"
                    type="text"
                    value={slackUserId}
                    onChange={(event) => setSlackUserId(event.target.value)}
                    placeholder="U0123456789"
                    required
                  />
                </>
              )}

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
          </>
        ) : (
          <p className="note">
            Dashboard controls are disabled. Set <code>TEST_API_SECRET</code> in
            your environment to enable save and test actions.
          </p>
        )}

        {statusMessage ? <p className="status">{statusMessage}</p> : null}
        {channelInstructions ? (
          <p className="status instructions">{channelInstructions}</p>
        ) : null}
      </section>
    </main>
  );
}
