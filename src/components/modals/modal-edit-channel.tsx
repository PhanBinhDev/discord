'use client';

import SelectEmoji from '@/components/shared/select-emoji';
import { TopicEditor } from '@/components/shared/topic-editor';
import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SnackbarUnsaved } from '@/components/ui/snackbar-unsaved';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChannelManageNavItems,
  SlowModeOptions,
  TOPIC_CHANNEL_MAX_LENGTH,
} from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useDirty } from '@/hooks/use-dirty';
import useModal from '@/hooks/use-modal';
import { ChannelWithCategory } from '@/types';
import {
  UpdateChannelFormValues,
  updateChannelSchema,
} from '@/validations/server';
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

  const getSlowModeLabel = (value: number) => {
    const option = SlowModeOptions.find(opt => opt.value === value);
    return option?.label || 'Off';
  };

  const form = useForm({
    resolver: zodResolver(updateChannelSchema),
    defaultValues: {
      name: channel?.name || '',
      isPrivate: channel?.isPrivate || false,
      isNsfw: channel?.isNsfw || false,
      topic: channel?.topic || '',
      slowMode: channel?.slowMode || 0,
    },
  });

  const { handleDiscard, handleSave, isDirty } = useDirty(form, {
    onSave: () => {
      form.handleSubmit(onSubmit)();
    },
  });

  const { mutate: updateChannel, pending } = useApiMutation(
    api.servers.updateChannel,
  );

  const onSubmit = (values: UpdateChannelFormValues) => {
    if (!isDirty) return;

    updateChannel({
      channelId: channel._id,
      name: values.name,
      isPrivate: values.isPrivate,
      isNsfw: values.isNsfw,
      topic: values.topic,
      slowMode: values.slowMode,
    })
      .then(() => {
        toast.success(dict?.servers.channel.edit.success);
        form.reset(values);
      })
      .catch(() => {
        toast.error(dict?.servers.channel.edit.error);
      });
  };

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        isPrivate: channel.isPrivate,
        isNsfw: channel.isNsfw || false,
        topic: channel.topic || '',
        slowMode: channel.slowMode || 0,
      });
    }
  }, [channel, form]);

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
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      <TranslateText value="servers.channel.edit.general.title" />
                    </h3>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <TranslateText value="servers.channel.edit.general.name" />{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupInput
                                placeholder={
                                  dict?.servers.channel.edit.general
                                    .namePlaceholder[channel.type]
                                }
                                {...field}
                              />
                              <InputGroupAddon
                                align="inline-end"
                                className="pr-2"
                              >
                                <SelectEmoji
                                  onSelect={e => {
                                    const prev = form.getValues('name') || '';
                                    form.setValue(
                                      'name',
                                      `${prev}${e.native}`,
                                      {
                                        shouldDirty: true,
                                      },
                                    );
                                  }}
                                />
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <TranslateText value="servers.channel.edit.general.topic" />
                        </FormLabel>
                        <FormControl>
                          <TopicEditor
                            value={field.value}
                            onChange={value => {
                              field.onChange(value);
                              form.trigger('topic');
                            }}
                            placeholder={
                              dict?.servers.channel.edit.general.topicPlaceholder.replace(
                                '{{max}}',
                                TOPIC_CHANNEL_MAX_LENGTH.toString(),
                              ) || ''
                            }
                            maxLength={TOPIC_CHANNEL_MAX_LENGTH}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slowMode"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>
                          <TranslateText value="servers.channel.edit.general.slowMode.label" />
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={String(field.value ?? 0)}
                            onValueChange={value =>
                              field.onChange(Number(value))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {getSlowModeLabel(field.value ?? 0)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent side="top">
                              <SelectGroup>
                                {SlowModeOptions.map(option => (
                                  <SelectItem
                                    key={option.value}
                                    value={String(option.value)}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          <TranslateText value="servers.channel.edit.general.slowMode.description" />
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isNsfw"
                    render={({ field }) => (
                      <FormItem className="mt-4 flex flex-row items-start justify-between rounded-lg border border-input p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            <TranslateText value="servers.channel.edit.general.nsfw.label" />
                          </FormLabel>
                          <FormDescription>
                            <TranslateText value="servers.channel.edit.general.nsfw.description" />
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            className="cursor-pointer"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="permissions">Hello Permissions</TabsContent>
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
