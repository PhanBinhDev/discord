'use client';

import SelectEmoji from '@/components/shared/select-emoji';
import TranslateText from '@/components/shared/translate/translate-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SnackbarUnsaved } from '@/components/ui/snackbar-unsaved';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryManageNavItems, DEFAULT_ROLE_COLOR } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useDirty } from '@/hooks/use-dirty';
import useModal from '@/hooks/use-modal';
import { getCreateCategorySchema } from '@/validations/server';
import { convexQuery } from '@convex-dev/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  IconShieldCheck,
  IconShieldCheckFilled,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalEditCategory = () => {
  const { isModalOpen, closeModal, openModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { category } = getModalData('ModalEditCategory') as {
    category: Doc<'channelCategories'>;
  };

  const [shake, setShake] = useState(false);

  const { data: categoryPermissions, isLoading: loadingCategoryPermissions } =
    useQuery({
      ...convexQuery(api.servers.getCategoryPermissions, {
        categoryId: category?._id,
      }),
      enabled: isModalOpen('ModalEditCategory') && !!category,
    });

  const form = useForm({
    resolver: zodResolver(getCreateCategorySchema()),
    defaultValues: {
      name: category?.name || '',
      isPrivate: category?.isPrivate || false,
    },
  });

  const { handleDiscard, handleSave, isDirty } = useDirty(form, {
    onSave: () => {
      form.handleSubmit(onSubmit)();
    },
  });

  const { mutate: updateCategory, pending } = useApiMutation(
    api.servers.updateCategory,
  );
  const { mutate: removePermission, pending: removingPermission } =
    useApiMutation(api.servers.removeCategoryPermissionById);

  const handleRemovePermission = (permissionId: Id<'categoryPermissions'>) => {
    removePermission({
      permissionId,
    })
      .then(() => {
        toast.success(dict?.servers.category.edit.permissions.removeSuccess);
      })
      .catch(() => {
        toast.error(dict?.servers.category.edit.permissions.removeError);
      });
  };

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        isPrivate: category.isPrivate,
      });
    }
  }, [category, form]);

  const onSubmit = (values: { name: string; isPrivate: boolean }) => {
    if (!isDirty) return;

    updateCategory({
      categoryId: category._id,
      name: values.name,
      isPrivate: values.isPrivate,
    })
      .then(() => {
        toast.success(dict?.servers.category.edit.success);
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
          closeModal('ModalEditCategory');
        }
      }}
      open={isModalOpen('ModalEditCategory')}
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
            <TranslateText value="servers.category.edit.title" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.category.edit.description" />
          </DialogDescription>
        </VisuallyHidden.Root>
        <Tabs
          defaultValue="account"
          orientation="vertical"
          className="flex flex-row h-full gap-0"
        >
          <div className="flex flex-col min-w-[200px] border-r border-muted-foreground/10 bg-muted/30 h-full">
            <TabsList className="flex flex-col w-full rounded-none p-4 bg-transparent gap-1 h-auto">
              {CategoryManageNavItems.map(item => {
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

                            openModal('ModalDeleteCategory', {
                              category,
                              callback: () => {
                                closeModal('ModalEditCategory');
                              },
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
                      <TranslateText value="servers.category.edit.general.title" />
                    </h3>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <TranslateText value="servers.category.categoryName" />{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <InputGroup className="mt-1">
                              <InputGroupInput
                                placeholder={
                                  dict?.servers.category.categoryNamePlaceholder
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
                </TabsContent>
                <TabsContent value="permissions">
                  <h3 className="text-lg font-semibold mb-4">
                    <TranslateText value="servers.category.edit.permissions.title" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    <TranslateText value="servers.category.edit.permissions.description" />
                  </p>
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
                                  <TranslateText value="servers.category.edit.permissions.privateCategory" />
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
                              <TranslateText value="servers.category.edit.permissions.privateCategoryDescription" />
                            </span>
                          </div>
                        </div>
                        <CollapsibleContent className="flex flex-col items-start gap-2 p-4 text-sm bg-muted/80">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">
                              <TranslateText value="servers.category.edit.permissions.whoCanAccess" />
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                openModal('ModalAddMemberRoles', {
                                  category,
                                });
                              }}
                            >
                              <TranslateText value="servers.category.edit.permissions.addUsersAndRoles" />
                            </Button>
                          </div>
                          <Separator className="my-1 bg-muted-foreground/10" />
                          <div className="flex flex-col w-full gap-2">
                            <span className="font-medium text-sm">
                              <TranslateText value="servers.category.roles" />
                            </span>
                            {loadingCategoryPermissions ? (
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
                            ) : categoryPermissions?.roles &&
                              categoryPermissions.roles.length > 0 ? (
                              <ScrollArea className="max-h-[200px]">
                                <div className="space-y-2">
                                  {categoryPermissions.roles.map(
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
                                            handleRemovePermission(permissionId)
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
                                <TranslateText value="servers.category.edit.permissions.noRoles" />
                              </p>
                            )}
                          </div>
                          <Separator className="my-1 bg-muted-foreground/10" />
                          <div className="flex flex-col w-full gap-2">
                            <span className="font-medium text-sm">
                              <TranslateText value="servers.category.members" />
                            </span>
                            {loadingCategoryPermissions ? (
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
                            ) : categoryPermissions?.users &&
                              categoryPermissions.users.length > 0 ? (
                              <ScrollArea className="max-h-[200px]">
                                <div className="space-y-2">
                                  {categoryPermissions.users.map(
                                    ({ permissionId, user }) => (
                                      <div
                                        key={permissionId}
                                        className="flex items-center justify-between p-2 pl-3 rounded-md bg-background/20 hover:bg-background/25 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Avatar className="size-8">
                                            <AvatarImage
                                              src={user?.avatarUrl}
                                            />
                                            <AvatarFallback>
                                              {user?.displayName?.[0] ||
                                                user?.username?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
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
                                                permissionId,
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
                                <TranslateText value="servers.category.edit.permissions.noMembers" />
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
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

export default ModalEditCategory;
