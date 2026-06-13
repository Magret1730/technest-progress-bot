import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPublicConfig } = require('../../../lib/slack');

export async function GET() {
  return NextResponse.json(getPublicConfig());
}
