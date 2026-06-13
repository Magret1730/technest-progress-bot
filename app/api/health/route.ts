import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'TechNest Slack Bot',
    timestamp: new Date().toISOString(),
  });
}
