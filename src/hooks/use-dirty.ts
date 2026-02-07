/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseDirtyOptions<TFormValues> {
  onDiscard?: () => void;
  onSave?: (data: TFormValues) => void | Promise<void>;
}

export const useDirty = <TFormValues extends Record<string, any>>(
  form: UseFormReturn<TFormValues>,
  options?: UseDirtyOptions<TFormValues>,
) => {
  const isDirty = form.formState.isDirty;

  const handleDiscard = useCallback(() => {
    form.reset();
    options?.onDiscard?.();
  }, [form, options]);

  const handleSave = useCallback(async () => {
    await form.handleSubmit(async data => {
      await options?.onSave?.(data);
    })();
  }, [form, options]);

  return {
    isDirty,
    handleDiscard,
    handleSave,
  };
};
