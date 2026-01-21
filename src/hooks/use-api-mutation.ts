/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from 'convex/react';
import { useState } from 'react';

export const useApiMutation = (mutationFn: any) => {
  const [pending, setPending] = useState(false);
  const apiMutation = useMutation(mutationFn);

  const mutate = async (payload?: any) => {
    setPending(true);
    try {
      let result: any;
      try {
        result = await apiMutation(payload);
      } finally {
        setPending(false);
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  return { mutate, pending };
};
