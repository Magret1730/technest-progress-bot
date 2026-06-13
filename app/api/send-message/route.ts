import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendHelloChan, formatSlackError } = require('../../../lib/slack');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSettings, validateSettings } = require('../../../lib/settings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isTestAuthorized } = require('../../../lib/auth');

type SendBody = {
  secret?: string;
  messageText?: string;
};

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      { error: 'Test send is disabled. Set TEST_API_SECRET in your environment.' },
      { status: 403 }
    );
  }

  let body: SendBody = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isTestAuthorized(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const saved = await getSettings();
    const messageText = body.messageText?.trim() || saved.messageText;
    validateSettings({
      messageText,
      scheduleCron: saved.scheduleCron,
      status: saved.status,
    });

    const result = await sendHelloChan({ messageText });
    return NextResponse.json({
      ok: true,
      channel: result.channel,
      text: result.text,
      ts: result.ts,
    });
  } catch (error) {
    const message = formatSlackError(error as Error);
    const status = message.includes('cannot be empty') ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
