import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { api, internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { auth } from './auth';

export function ensureEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`missing environment variable ${name}`);
  }
  return value;
}

const webhookSecret = ensureEnvironmentVariable('CLERK_WEBHOOK_SECRET');

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request);
  if (!event) {
    return new Response('Error occurred', {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        await ctx.runMutation(api.users.upsertFromClerk, {
          data: event.data,
        });
        break;
      }

      case 'user.deleted': {
        const clerkId = event.data.id!;
        await ctx.runMutation(internal.users.deleteUser, {
          clerkId,
        });
        break;
      }
    }

    return new Response(null, {
      status: 200,
    });
  } catch {
    return new Response(null, {
      status: 200,
    });
  }
});

const http = httpRouter();

http.route({
  path: '/webhooks/clerk',
  method: 'POST',
  handler: handleClerkWebhook,
});

async function validateRequest(
  req: Request,
): Promise<WebhookEvent | undefined> {
  const payloadString = await req.text();

  const svixHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  const wh = new Webhook(webhookSecret);

  try {
    const evt = wh.verify(payloadString, svixHeaders);
    return evt as unknown as WebhookEvent;
  } catch (error) {
    console.error('Error verifying webhook:', error);
    return;
  }
}

auth.addHttpRoutes(http);

export default http;
