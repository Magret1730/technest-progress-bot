import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSettings, saveSettings } = require('../../../lib/settings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isTestAuthorized } = require('../../../lib/auth');

type SettingsBody = {
  secret?: string;
  messageText?: string;
  scheduleCron?: string;
  status?: string;
};

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      { error: 'Settings save is disabled. Set TEST_API_SECRET in your environment.' },
      { status: 403 }
    );
  }

  let body: SettingsBody = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isTestAuthorized(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await saveSettings(body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
