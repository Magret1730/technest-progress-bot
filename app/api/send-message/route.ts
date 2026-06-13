import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendMessage, formatSlackError } = require('../../../lib/slack');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateSendInput } = require('../../../lib/settings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isTestAuthorized } = require('../../../lib/auth');

type SendBody = {
  secret?: string;
  messageText?: string;
  slackChannelId?: string;
};

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      { error: 'Send is disabled. Set TEST_API_SECRET in your environment.' },
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
    const payload = validateSendInput(body);
    const result = await sendMessage(payload);
    return NextResponse.json({
      ok: true,
      channel: result.channel,
      text: result.text,
      ts: result.ts,
    });
  } catch (error) {
    const message = formatSlackError(error as Error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
