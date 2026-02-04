import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getCurrentUserOrThrow } from './users';

export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const saveAvatar = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
      }
    }

    const avatarUrl = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(user._id, {
      avatarUrl: avatarUrl ?? undefined,
      avatarStorageId: args.storageId,
    });

    return { success: true, avatarUrl };
  },
});

export const deleteAvatar = mutation({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (error) {
        console.error('Failed to delete avatar from storage:', error);
      }
    }

    await ctx.db.patch(user._id, {
      avatarUrl: undefined,
      avatarStorageId: undefined,
    });

    return { success: true };
  },
});

export const saveBanner = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!user) throw new Error('User not found');

    if (user.bannerStorageId) {
      try {
        await ctx.storage.delete(user.bannerStorageId);
      } catch (error) {
        console.error('Failed to delete old banner:', error);
      }
    }

    const bannerUrl = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(user._id, {
      bannerUrl: bannerUrl ?? undefined,
      bannerStorageId: args.storageId,
    });

    return { success: true, bannerUrl };
  },
});

export const deleteBanner = mutation({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.bannerStorageId) {
      try {
        await ctx.storage.delete(user.bannerStorageId);
      } catch (error) {
        console.error('Failed to delete banner from storage:', error);
      }
    }

    await ctx.db.patch(user._id, {
      bannerUrl: undefined,
      bannerStorageId: undefined,
    });

    return { success: true };
  },
});
