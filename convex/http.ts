/* eslint-disable @typescript-eslint/no-explicit-any */
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

  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1}/${maxRetries} failed:`, error);

        if (i < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        try {
          await retryWithBackoff(() =>
            ctx.runMutation(internal.users.upsertFromClerk, {
              data: event.data,
            }),
          );
          console.log(`User ${event.data.id} synced successfully`);
        } catch (error) {
          console.error(`Failed to sync user ${event.data.id}:`, error);
        }
        break;
      }

      case 'user.deleted': {
        const clerkId = event.data.id!;
        console.log('User deleted in Clerk:', clerkId);

        try {
          await retryWithBackoff(() =>
            ctx.runMutation(internal.users.deleteUser, {
              clerkId,
            }),
          );
          console.log(`User ${clerkId} deleted successfully`);
        } catch (error) {
          console.error(`Failed to delete user ${clerkId}:`, error);
        }
        break;
      }
    }

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Return 200 to acknowledge receipt, preventing Clerk retry storm
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
