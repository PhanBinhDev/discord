import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
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

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      await ctx.runMutation(internal.users.upsertFromClerk, {
        data: event.data,
      });
      break;
    }

    case 'user.deleted': {
      const clerkId = event.data.id!;
      console.log('User deleted in Clerk:', clerkId);

      await ctx.runMutation(internal.users.deleteUser, {
        clerkId,
      });

      console.log(`User ${clerkId} soft deleted successfully`);
      break;
    }

    case 'organization.deleted': {
      console.log('Clerk webhook event:', event.type, event.data);
      break;
    }

    default: {
      console.log('Ignored Clerk webhook event:', event.type);
    }
  }

  return new Response(null, {
    status: 200,
  });
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
