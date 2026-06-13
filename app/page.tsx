'use client';

import { FormEvent, useEffect, useState } from 'react';

type AppConfig = {
  appName: string;
  description: string;
  messageText: string;
  scheduleCron: string;
  scheduleDescription: string;
  testSendEnabled: boolean;
};

type SendResult = {
  ok: boolean;
  error?: string;
  text?: string;
  channel?: string;
};

export default function HomePage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => setStatus('Could not load app configuration.'));

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status === 'ok' ? 'live' : 'unknown'))
      .catch(() => setHealth('offline'));
  }, []);

  async function handleTestSend(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ secret }),
      });

      const data: SendResult = await response.json();

      if (!response.ok) {
        setStatus(data.error || 'Failed to send test message.');
        return;
      }

      setStatus(`Sent "${data.text}" to Slack channel ${data.channel}.`);
    } catch {
      setStatus('Network error while sending test message.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Technest Community</p>
        <h1>{config?.appName || 'TechNest Slack Bot'}</h1>
        <p className="description">
          {config?.description ||
            'Sends weekly TechNest progress updates to Chan Meng on Slack.'}
        </p>

        <dl className="meta">
          <div>
            <dt>Status</dt>
            <dd className={health}>{health}</dd>
          </div>
          <div>
            <dt>Weekly message</dt>
            <dd>{config?.messageText || 'Hello Chan'}</dd>
          </div>
          <div>
            <dt>Schedule</dt>
            <dd>
              {config?.scheduleDescription || 'Every Sunday at 12:00 PM'}
            </dd>
          </div>
          <div>
            <dt>Cron expression</dt>
            <dd>
              <code>{config?.scheduleCron || '0 12 * * 0'}</code>
            </dd>
          </div>
        </dl>

        {config?.testSendEnabled ? (
          <form className="test-form" onSubmit={handleTestSend}>
            <label htmlFor="secret">Test API secret</label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Enter TEST_API_SECRET"
              autoComplete="off"
              required
            />
            <button type="submit" disabled={loading || !secret}>
              {loading ? 'Sending…' : 'Send test message'}
            </button>
          </form>
        ) : (
          <p className="note">
            Test send is disabled. Set <code>TEST_API_SECRET</code> in your
            environment to enable the button.
          </p>
        )}

        {status ? <p className="status">{status}</p> : null}
      </section>
    </main>
  );
}
