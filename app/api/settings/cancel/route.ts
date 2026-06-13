import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cancelSchedule } = require('../../../../lib/settings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isTestAuthorized } = require('../../../../lib/auth');

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      { error: 'Schedule cancel is disabled. Set TEST_API_SECRET in your environment.' },
      { status: 403 }
    );
  }

  let body: { secret?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isTestAuthorized(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await cancelSchedule();
    return NextResponse.json({
      ok: true,
      settings,
      message: 'Schedule cancelled.',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
