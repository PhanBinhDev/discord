/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExtractArgs } from '@/types';
import { useMutation } from 'convex/react';
import { FunctionReference } from 'convex/server';
import { useState } from 'react';

export const useApiMutation = <
  T extends FunctionReference<'mutation', 'public', any>,
>(
  mutationFn: T,
) => {
  const [pending, setPending] = useState(false);
  const apiMutation = useMutation(mutationFn);

  type PayloadType = ExtractArgs<T>;

  const mutate = async (payload?: PayloadType) => {
    setPending(true);
    try {
      const result = await apiMutation(payload);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setPending(false);
    }
  };

  return { mutate, pending };
};
