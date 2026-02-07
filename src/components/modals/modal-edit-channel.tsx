'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { SnackbarUnsaved } from '@/components/ui/snackbar-unsaved';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChannelManageNavItems } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useDirty } from '@/hooks/use-dirty';
import useModal from '@/hooks/use-modal';
import { ChannelWithCategory } from '@/types';
import { updateChannelSchema } from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalEditChannel = () => {
  const { isModalOpen, closeModal, openModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { channel } = getModalData('ModalEditChannel') as {
    channel: ChannelWithCategory;
  };

  const [shake, setShake] = useState(false);

  const form = useForm({
    resolver: zodResolver(updateChannelSchema),
    defaultValues: {
      name: channel?.name || '',
      isPrivate: channel?.isPrivate || false,
    },
  });

  const { handleDiscard, handleSave, isDirty } = useDirty(form, {
    onSave: async () => {
      form.handleSubmit(onSubmit)();
    },
    onDiscard: () => {
      form.reset();
    },
  });

  const { mutate: updateChannel, pending } = useApiMutation(
    api.servers.updateChannel,
  );

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        isPrivate: channel.isPrivate,
      });
    }
  }, [channel, form]);
  const onSubmit = (values: { name: string; isPrivate: boolean }) => {
    updateChannel({
      channelId: channel._id,
      name: values.name,
      isPrivate: values.isPrivate,
    })
      .then(() => {
        toast.success(dict?.servers.channel.edit.success);
        form.reset(values);
      })
      .catch(() => {
        toast.error(dict?.servers.category.edit.error);
      });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  return (
    <Dialog
      onOpenChange={open => {
        if (!open && isDirty) {
          triggerShake();
          return;
        }
        if (!open) {
          closeModal('ModalEditChannel');
        }
      }}
      open={isModalOpen('ModalEditChannel')}
    >
      <DialogContent
        className="sm:max-w-6xl h-[95vh] p-0 overflow-hidden"
        onInteractOutside={e => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-snackbar-unsaved]')) {
            e.preventDefault();
            return;
          }
          if (isDirty) {
            e.preventDefault();
            triggerShake();
          }
        }}
      >
        <VisuallyHidden.Root>
          <DialogTitle>
            <TranslateText value="servers.channel.edit.title" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.channel.edit.description" />
          </DialogDescription>
        </VisuallyHidden.Root>
        <Tabs
          defaultValue="account"
          orientation="vertical"
          className="flex flex-row h-full gap-0"
        >
          <div className="flex flex-col min-w-[200px] border-r border-muted-foreground/10 bg-muted/30 h-full">
            <TabsList className="flex flex-col w-full rounded-none p-4 bg-transparent gap-1 h-auto">
              {ChannelManageNavItems.map(item => {
                const Icon = item.icon;
                const isDelete = item.key === 'delete';

                return (
                  <Fragment key={item.key}>
                    {isDelete ? (
                      <>
                        <Separator className="my-1 bg-muted-foreground/10" />
                        <Button
                          className="w-full p-2 px-2! gap-1.5 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center"
                          variant={'ghost'}
                          onClick={() => {
                            if (isDirty) {
                              triggerShake();
                              return;
                            }

                            openModal('ModalDeleteChannel', {
                              channel,
                              callback: () => closeModal('ModalEditChannel'),
                            });
                          }}
                        >
                          <Icon className="size-4" />
                          <TranslateText value={item.label} />
                        </Button>
                      </>
                    ) : (
                      <TabsTrigger
                        value={item.key}
                        className={`w-full justify-start border-none p-2 hover:bg-muted-foreground/10 cursor-pointer${isDelete ? ' text-destructive' : ''}`}
                      >
                        <Icon className="size-4" />
                        <TranslateText value={item.label} />
                      </TabsTrigger>
                    )}
                  </Fragment>
                );
              })}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <TabsContent value="general" className="space-y-4">
                  hello
                </TabsContent>
              </form>
            </Form>
          </div>
        </Tabs>
      </DialogContent>
      <SnackbarUnsaved
        open={isDirty}
        onDiscard={handleDiscard}
        onSave={handleSave}
        loading={pending}
        shake={shake}
      />
    </Dialog>
  );
};

export default ModalEditChannel;
