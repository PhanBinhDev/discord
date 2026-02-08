'use client';

import { columns } from '@/components/columns/invite';
import SelectEmoji from '@/components/shared/select-emoji';
import { DataTable } from '@/components/shared/table/data-table';
import { TopicEditor } from '@/components/shared/topic-editor';
import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Item, ItemContent, ItemMedia } from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SnackbarUnsaved } from '@/components/ui/snackbar-unsaved';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChannelManageNavItems,
  DEFAULT_LIMIT,
  DEFAULT_ROLE_COLOR,
  SlowModeOptions,
  TOPIC_CHANNEL_MAX_LENGTH,
} from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useDirty } from '@/hooks/use-dirty';
import useModal from '@/hooks/use-modal';
import { ChannelWithCategory } from '@/types';
import {
  UpdateChannelFormValues,
  updateChannelSchema,
} from '@/validations/server';
import { convexQuery } from '@convex-dev/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  IconRefresh,
  IconRefreshAlert,
  IconShieldCheck,
  IconShieldCheckFilled,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { usePaginatedQuery } from 'convex/react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalEditChannel = () => {
  const { isModalOpen, closeModal, openModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { channel } = getModalData('ModalEditChannel') as {
    channel: ChannelWithCategory;
  };

  const [shake, setShake] = useState(false);
  const [savedIsPrivate, setSavedIsPrivate] = useState(
    channel?.isPrivate || false,
  );

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

  const { data: channelPermissions, isLoading: loadingChannelPermissions } =
    useQuery({
      ...convexQuery(api.servers.getChannelPermissions, {
        channelId: channel?._id,
      }),
      enabled: isModalOpen('ModalEditChannel') && !!channel,
    });

  const { loadMore, isLoading, results, status } = usePaginatedQuery(
    api.servers.getChannelInvites,
    {
      channelId: channel?._id,
    },
    {
      initialNumItems: DEFAULT_LIMIT,
    },
  );

  const invites = useMemo(
    () => results?.flatMap(page => page) ?? [],
    [results],
  );

  const canLoadMore = status === 'CanLoadMore' && !isLoading;

  const { mutate: updateChannel, pending } = useApiMutation(
    api.servers.updateChannel,
  );

  const { mutate: syncChannelWithCategory, pending: syncPending } =
    useApiMutation(api.servers.updateChannel);

  const { mutate: removePermission, pending: removingPermission } =
    useApiMutation(api.servers.removeChannelPermissionById);

  const isSyncedWithCategory = useMemo(() => {
    if (!channel?.category) return true;
    return savedIsPrivate === channel.category.isPrivate;
  }, [channel?.category, savedIsPrivate]);

  const handleSyncWithCategory = () => {
    if (!channel?.category) return;

    syncChannelWithCategory({
      channelId: channel._id,
      isPrivate: channel.category.isPrivate,
    })
      .then(() => {
        toast.success(dict?.servers.channel.edit.permissions.syncSuccess);
        setSavedIsPrivate(channel.category?.isPrivate || false);
        form.setValue('isPrivate', channel.category?.isPrivate || false, {
          shouldDirty: false,
        });
      })
      .catch(() => {
        toast.error(dict?.servers.channel.edit.permissions.syncError);
      });
  };

  const handleRemovePermission = (permissionId: Id<'channelPermissions'>) => {
    removePermission({
      permissionId,
    })
      .then(() => {
        toast.success(dict?.servers.channel.edit.permissions.removeSuccess);
      })
      .catch(() => {
        toast.error(dict?.servers.channel.edit.permissions.removeError);
      });
  };

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
        setSavedIsPrivate(values.isPrivate);
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
      setSavedIsPrivate(channel.isPrivate);
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
          defaultValue="general"
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
                <TabsContent value="permissions" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      <TranslateText value="servers.channel.edit.permissions.title" />
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      <TranslateText value="servers.channel.edit.permissions.description" />
                    </p>
                  </div>
                  {channel.category && (
                    <Item variant={'outline'} size="default">
                      <ItemContent className="flex items-center flex-row">
                        <ItemMedia>
                          {isSyncedWithCategory ? (
                            <IconRefresh className="size-5 text-yellow-500" />
                          ) : (
                            <IconRefreshAlert className="size-5 text-yellow-500" />
                          )}
                        </ItemMedia>
                        <p>
                          <TranslateText
                            value={
                              isSyncedWithCategory
                                ? 'servers.channel.edit.permissions.syncedWith'
                                : 'servers.channel.edit.permissions.notSyncedWith'
                            }
                          />{' '}
                          <span className="font-semibold">
                            {channel.category?.name}
                          </span>
                        </p>

                        {!isSyncedWithCategory && (
                          <Button
                            onClick={handleSyncWithCategory}
                            disabled={syncPending}
                            className="ml-auto bg-muted-foreground/5 hover:bg-muted-foreground/10 cursor-pointer"
                            variant={'ghost'}
                            size="sm"
                            loading={syncPending}
                          >
                            <TranslateText value="servers.channel.edit.permissions.syncNow" />
                          </Button>
                        )}
                      </ItemContent>
                    </Item>
                  )}

                  <Card className="p-0 mt-4 overflow-hidden rounded-md border border-foreground/10 shadow-none">
                    <CardContent className="p-0">
                      <Collapsible
                        className="bg-muted"
                        open={form.getValues('isPrivate')}
                        onOpenChange={open => {
                          form.setValue('isPrivate', open, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        <div className="flex items-center justify-between w-full p-4 bg-background/15 transition-colors">
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconShieldCheck className="size-4" />
                                <span className="text-sm font-semibold">
                                  <TranslateText value="servers.channel.edit.permissions.privateChannel" />
                                </span>
                              </div>
                              <CollapsibleTrigger asChild>
                                <FormField
                                  control={form.control}
                                  name="isPrivate"
                                  render={({ field }) => (
                                    <FormItem className="m-0">
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          className="cursor-pointer"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </CollapsibleTrigger>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              <TranslateText value="servers.channel.edit.permissions.privateChannelDescription" />
                            </span>
                          </div>
                        </div>
                        <CollapsibleContent className="flex flex-col items-start gap-2 p-4 text-sm bg-muted/80">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">
                              <TranslateText value="servers.channel.edit.permissions.whoCanAccess" />
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                openModal('ModalAddMemberRoles', {
                                  channel,
                                });
                              }}
                            >
                              <TranslateText value="servers.channel.edit.permissions.addUsersAndRoles" />
                            </Button>
                          </div>
                          <Separator className="my-1 bg-muted-foreground/10" />
                          <div className="flex flex-col w-full gap-2">
                            <span className="font-medium text-sm">
                              <TranslateText value="servers.category.roles" />
                            </span>
                            {loadingChannelPermissions ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-2 rounded-md bg-background/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Skeleton className="size-8 rounded-full" />
                                      <Skeleton className="h-4 w-24" />
                                    </div>
                                    <Skeleton className="size-8" />
                                  </div>
                                ))}
                              </div>
                            ) : channelPermissions?.roles &&
                              channelPermissions.roles.length > 0 ? (
                              <ScrollArea className="max-h-[200px]">
                                <div className="space-y-2">
                                  {channelPermissions.roles.map(
                                    ({ permissionId, role }) => (
                                      <div
                                        key={permissionId}
                                        className="flex items-center justify-between p-2 pl-3 rounded-md bg-background/20 hover:bg-background/25 transition-colors"
                                      >
                                        <div className="flex items-center gap-1">
                                          <IconShieldCheckFilled
                                            className="size-4"
                                            style={{
                                              color:
                                                role?.color ||
                                                DEFAULT_ROLE_COLOR,
                                            }}
                                          />
                                          <span className="text-sm font-medium">
                                            {role?.name}
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 hover:bg-destructive/10 hover:text-destructive"
                                          onClick={() =>
                                            handleRemovePermission(
                                              permissionId as Id<'channelPermissions'>,
                                            )
                                          }
                                          disabled={removingPermission}
                                        >
                                          <IconTrash className="size-4" />
                                        </Button>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-muted-foreground italic py-2">
                                <TranslateText value="servers.channel.edit.permissions.noRoles" />
                              </p>
                            )}
                          </div>
                          <Separator className="my-1 bg-muted-foreground/10" />
                          <div className="flex flex-col w-full gap-2">
                            <span className="font-medium text-sm">
                              <TranslateText value="servers.category.members" />
                            </span>
                            {loadingChannelPermissions ? (
                              <div className="space-y-2">
                                {[1, 2].map(i => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-2 pl-3 rounded-md bg-background/25"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Skeleton className="size-8 rounded-full" />
                                      <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                      </div>
                                    </div>
                                    <Skeleton className="size-8" />
                                  </div>
                                ))}
                              </div>
                            ) : channelPermissions?.users &&
                              channelPermissions.users.length > 0 ? (
                              <ScrollArea className="max-h-[200px]">
                                <div className="space-y-2">
                                  {channelPermissions.users.map(
                                    ({ permissionId, user }) => (
                                      <div
                                        key={permissionId}
                                        className="flex items-center justify-between p-2 pl-3 rounded-md bg-background/20 hover:bg-background/25 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <UserAvatar
                                            src={user?.avatarUrl}
                                            size={6}
                                            name={
                                              user?.displayName ||
                                              user?.username
                                            }
                                          />
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-sm font-medium">
                                                {user?.displayName ||
                                                  user?.username}
                                              </span>
                                              {permissionId === 'owner' && (
                                                <Badge
                                                  variant="default"
                                                  className="text-xs px-1.5 py-0.5 h-4"
                                                >
                                                  <TranslateText value="servers.category.owner" />
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              @{user?.username}
                                            </span>
                                          </div>
                                        </div>

                                        {permissionId !== 'owner' && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                              handleRemovePermission(
                                                permissionId as Id<'channelPermissions'>,
                                              )
                                            }
                                            disabled={
                                              removingPermission ||
                                              permissionId === 'owner'
                                            }
                                          >
                                            <IconTrash className="size-4" />
                                          </Button>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-muted-foreground italic py-2">
                                <TranslateText value="servers.channel.edit.permissions.noMembers" />
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="invite" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      <TranslateText value="servers.channel.edit.invite.title" />
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      {dict?.servers.channel.edit.invite.description
                        ?.split('{{action}}')
                        .map((part, index, array) => (
                          <Fragment key={index}>
                            {part}
                            {index < array.length - 1 && (
                              <Button
                                variant="link"
                                className="px-0.5"
                                onClick={() => {
                                  openModal('ModalCreateInviteChannel', {
                                    channel,
                                    serverId: channel.serverId,
                                    serverName: 'Server name',
                                  });
                                }}
                              >
                                {dict?.servers.channel.edit.invite.createNew}
                              </Button>
                            )}
                          </Fragment>
                        ))}
                    </p>
                  </div>
                  <DataTable
                    columns={columns}
                    data={invites}
                    options={{
                      loading: isLoading,
                      toolbar: false,
                      paginationType: 'button-load-more',
                      paginationButton: (
                        <div className="flex items-center justify-center py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadMore}
                            disabled={!canLoadMore}
                            loading={isLoading}
                            className="gap-2"
                          >
                            {canLoadMore ? (
                              <TranslateText value="common.loadMore" />
                            ) : (
                              <TranslateText value="common.noResultsFound" />
                            )}
                          </Button>
                        </div>
                      ),
                      emptyText: {
                        value: 'servers.channel.edit.invite.noInvites',
                      }
                    }}
                  />
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
