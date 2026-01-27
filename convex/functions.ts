import {
  customCtx,
  customMutation,
} from 'convex-helpers/server/customFunctions';
import { Triggers } from 'convex-helpers/server/triggers';
import removeAccents from 'remove-accents';
import { DataModel } from './_generated/dataModel';
import {
  internalMutation as rawInternalMutation,
  mutation as rawMutation,
} from './_generated/server';

const triggers = new Triggers<DataModel>();

triggers.register('users', async (ctx, change) => {
  if (change.operation === 'insert' || change.operation === 'update') {
    const doc = change.newDoc!;

    const newSearchText = [
      doc.displayName,
      doc.username,
      doc.discriminator,
      doc.email,
    ]
      .filter(Boolean)
      .join(' ');

    if (doc.searchText !== newSearchText) {
      await ctx.db.patch(change.id, {
        searchText: removeAccents(newSearchText),
      });
    }
  }
});

export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);
