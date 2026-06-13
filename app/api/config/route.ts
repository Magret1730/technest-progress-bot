import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSettings } = require('../../../lib/settings');

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}
