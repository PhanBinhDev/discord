/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { DictKey, getDictValue } from '@/internationalization/get-dictionaries';
import { AddFriendFormValues, getAddFriendSchema } from '@/validations/friend';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const SearchAndAddFriend = () => {
  const { dict } = useClientDictionary();
  const { mutate: sendFriendRequest, pending } = useApiMutation(
    api.friends.sendFriendRequestByUsername,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<AddFriendFormValues>({
    resolver: zodResolver(getAddFriendSchema()),
  });

  const onSubmit = (values: AddFriendFormValues) => {
    sendFriendRequest({ username: values.username })
      .then(() => {
        toast.success(dict?.servers.directMessage.addFriend.success);
        reset();
      })
      .catch((error: any) => {
        const errorKey = error?.data as DictKey;

        const errorMessage = getDictValue(dict, errorKey);

        toast.error(errorMessage);
      });
  };

  const username = watch('username');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
      <InputGroup className="p-1 h-12">
        <InputGroupInput
          {...register('username')}
          placeholder={dict?.servers.directMessage.addFriend.placeholder}
          className="bg-background/60 border-muted-foreground/20 h-14 text-base"
          disabled={pending}
        />
        <InputGroupAddon align="inline-end" className="pr-2 space-x-2">
          <Button
            type="submit"
            loading={pending}
            disabled={pending || !username?.trim()}
          >
            <TranslateText value="servers.directMessage.addFriend.sendRequest" />
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {errors.username && (
        <p className="text-sm text-destructive mt-2">
          {dict?.servers.directMessage.addFriend.usernameRequired ||
            errors.username.message}
        </p>
      )}
    </form>
  );
};

export default SearchAndAddFriend;
