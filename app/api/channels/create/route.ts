import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createPrivateChannel } = require('../../../../lib/slack');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSettings, saveSettings } = require('../../../../lib/settings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isTestAuthorized } = require('../../../../lib/auth');

type CreateChannelBody = {
  secret?: string;
  channelName?: string;
};

export async function POST(request: Request) {
  if (!process.env.TEST_API_SECRET) {
    return NextResponse.json(
      {
        error:
          'Channel creation is disabled. Set TEST_API_SECRET in your environment.',
      },
      { status: 403 }
    );
  }

  let body: CreateChannelBody = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isTestAuthorized(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const created = await createPrivateChannel(body.channelName);
    const current = await getSettings();

    const settings = await saveSettings({
      messageText: current.messageText,
      scheduleCron: current.scheduleCron,
      status: current.status,
      destinationType: 'channel',
      slackChannelId: created.channelId,
      slackUserId: current.slackUserId,
    });

    return NextResponse.json({
      ok: true,
      channelId: created.channelId,
      channelName: created.channelName,
      isPrivate: created.isPrivate,
      settings,
      instructions:
        'Private channel created. The bot was added automatically. Invite Chan Meng manually in Slack with /invite @chan or Add people, unless your app has user-invite permissions.',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
