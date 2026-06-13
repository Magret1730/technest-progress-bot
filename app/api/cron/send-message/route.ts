import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendHelloChan, formatSlackError } = require('../../../../lib/slack');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSettings } = require('../../../../lib/settings');

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();

    if (settings.status === 'Paused') {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Bot status is Paused',
        status: settings.status,
      });
    }

    const result = await sendHelloChan();
    return NextResponse.json({
      ok: true,
      skipped: false,
      channel: result.channel,
      text: result.text,
      ts: result.ts,
      status: settings.status,
    });
  } catch (error) {
    const message = formatSlackError(error as Error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
