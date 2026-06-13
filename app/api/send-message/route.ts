import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendHelloChan, formatSlackError } = require('../../../lib/slack');

function isAuthorized(request: Request, body: { secret?: string }) {
  const expected = process.env.TEST_API_SECRET;
  if (!expected) {
    return false;
  }

  const header = request.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const provided = bearer || body.secret;

  return provided === expected;
}

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      { error: 'Test send is disabled. Set TEST_API_SECRET in your environment.' },
      { status: 403 }
    );
  }

  let body: { secret?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isAuthorized(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendHelloChan();
    return NextResponse.json({
      ok: true,
      channel: result.channel,
      text: result.text,
      ts: result.ts,
    });
  } catch (error) {
    const message = formatSlackError(error as Error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
