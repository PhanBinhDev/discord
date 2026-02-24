'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { useUploadFile } from '@/hooks/use-upload-file';
import { cn } from '@/lib/utils';
import { getServerSchema, ServerFormValues } from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconUpload } from '@tabler/icons-react';
import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const ModalCreateServer = () => {
  const { closeModal, isModalOpen } = useModal();
  const { dict } = useClientDictionary();
  const { mutate: createServer, pending } = useApiMutation(
    api.servers.createServer,
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { mutateAsync: uploadFile } = useUploadFile();

  const serverForm = useForm({
    resolver: zodResolver(getServerSchema()),
    defaultValues: {
      name: '',
      isPublic: true,
    },
  });

  const handleClose = () => {
    serverForm.reset();
    setImagePreview(null);
    setSelectedFile(null);
    closeModal('ModalCreateServer');
  };

  const onSubmit = async (values: ServerFormValues) => {
    try {
      if (!selectedFile) {
        toast.error(dict?.servers.serverIconRequired);
        return;
      }

      const result = await uploadFile([selectedFile]);

      await createServer({
        ...values,
        iconStorageId: result[0].storageId,
        iconUrl: result[0].url || '',
      });
      toast.success(dict?.servers.serverCreated);
      handleClose();
    } catch {
      toast.error(dict?.servers.serverCreationFailed);
    }
  };

  return (
    <Dialog onOpenChange={handleClose} open={isModalOpen('ModalCreateServer')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.customizeServer" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.customizeDescription" />
          </DialogDescription>
        </DialogHeader>

        <Form {...serverForm}>
          <form
            onSubmit={serverForm.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <label
                htmlFor="server-icon"
                className={cn(
                  'relative group size-20 rounded-full border-[1.5px] border-dashed  transition-colors flex items-center justify-center bg-background/60 dark:bg-black/20 cursor-pointer overflow-hidden',
                  imagePreview
                    ? 'border-transparent'
                    : 'border-border hover:border-(--accent-color)',
                )}
              >
                <Input
                  id="server-icon"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="Server icon preview"
                      className="w-full h-full object-cover"
                      width={80}
                      height={80}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <IconUpload className="size-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center pointer-events-none flex flex-col items-center">
                    <IconUpload className="size-5 mb-2 text-muted-foreground group-hover:text-(--accent-color) transition-colors" />
                    <span className="text-xs uppercase font-semibold text-muted-foreground group-hover:text-(--accent-color)">
                      <TranslateText value="common.upload.title" />
                    </span>
                  </div>
                )}
              </label>
            </div>

            <FormField
              control={serverForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <TranslateText value="servers.serverName" />{' '}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={dict?.servers.serverName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={serverForm.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-4 bg-background/60 dark:bg-black/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      <TranslateText value="servers.publicServer" />
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      <TranslateText value="servers.publicServerDescription" />
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row gap-2 mt-1.5">
              <Button
                type="submit"
                loading={pending || serverForm.formState.isSubmitting}
                disabled={pending || serverForm.formState.isSubmitting}
                className="flex-1"
              >
                <TranslateText value="servers.create" />
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
