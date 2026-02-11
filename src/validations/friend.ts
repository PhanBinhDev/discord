import { getGlobalDict } from '@/lib/dictionary-store';
import z from 'zod';

export const getAddFriendSchema = () => {
  const dict = getGlobalDict();

  return z.object({
    username: z
      .string()
      .min(
        1,
        dict?.servers.directMessage.addFriend.usernameRequired ||
          'Username is required',
      ),
  });
};

export type AddFriendFormValues = z.infer<
  ReturnType<typeof getAddFriendSchema>
>;
