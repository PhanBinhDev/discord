import SelectEmoji from '@/components/shared/select-emoji';
import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import {
  CreateCategoryFormValues,
  createCategorySchema,
} from '@/validations/server';
import { convexQuery } from '@convex-dev/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconShieldLockFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalCreateCategory = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');

  const { server } = getModalData('ModalCreateCategory') as {
    server: Doc<'servers'>;
  };

  const createChannelForm = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      isPrivate: false,
    },
  });

  const isPrivate = createChannelForm.watch('isPrivate');
  const name = createChannelForm.watch('name');

  const { mutate: createCategory, pending } = useApiMutation(
    api.servers.createCategory,
  );

  const { data: searchResults } = useQuery({
    ...convexQuery(api.servers.searchUsersAndRoles, {
      serverId: server._id,
      query: search,
    }),
    enabled: step === 2 && isPrivate,
  });

  const onSubmit = ({ isPrivate, name }: CreateCategoryFormValues) => {
    if (isPrivate && step === 1) {
      setStep(2);
      return;
    }

    createCategory({
      name,
      serverId: server._id as Id<'servers'>,
      isPrivate,
      roleIds: isPrivate ? [] : undefined,
    })
      .then(() => {
        toast.success(dict?.servers.category.categoryCreated);
        closeModal('ModalCreateCategory');
      })
      .catch(() => {
        toast.error(dict?.servers.category.createError);
      });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateCategory')}
      open={isModalOpen('ModalCreateCategory')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-left">
            <TranslateText value="servers.category.title" />
          </DialogTitle>
          <DialogDescription className="text-left">
            {isPrivate && step === 2 && <>{name}</>}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Form {...createChannelForm}>
            <form
              onSubmit={createChannelForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <FormField
                    control={createChannelForm.control}
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
                                  const prev =
                                    createChannelForm.getValues('name') || '';
                                  createChannelForm.setValue(
                                    'name',
                                    `${prev}${e.native}`,
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

                  <FormField
                    control={createChannelForm.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-1">
                            <IconShieldLockFilled className="size-4 inline-block" />
                            <TranslateText value="servers.category.privateCategory" />
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            <TranslateText value="servers.category.privateCategoryDescription" />
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            className="self-start mt-1.5 cursor-pointer"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <Textarea
                    className="mt-1.5 py-2"
                    placeholder={
                      dict?.servers.category.searchUserRolePlaceholder
                    }
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />

                  <ScrollArea className="min-h-[200px]">
                    <div className="space-y-3">
                      {/* Roles Section */}
                      {searchResults?.roles &&
                        searchResults.roles.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">
                              <TranslateText value="servers.category.roles" />
                            </h3>
                            <div className="space-y-2">
                              {searchResults.roles.map(role => (
                                <div
                                  key={role._id}
                                  className="flex items-center gap-2 p-2.5 rounded-md cursor-pointer hover:bg-muted-foreground/10"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{
                                      backgroundColor: role.color || '#808080',
                                    }}
                                  />
                                  <span className="text-sm">{role.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    <TranslateText value="servers.category.roles" />
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Users Section */}
                      {searchResults?.users &&
                        searchResults.users.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">
                              <TranslateText value="servers.category.members" />
                            </h3>
                            <div className="space-y-2">
                              {searchResults.users.map(user => (
                                <div
                                  key={user._id}
                                  className="flex items-center gap-2 p-2.5 rounded-md cursor-pointer hover:bg-muted-foreground/10"
                                >
                                  {user.avatarUrl ? (
                                    <Image
                                      src={user.avatarUrl}
                                      alt={user.displayName || 'user'}
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-muted" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">
                                      {user.displayName || user.username}
                                    </p>
                                  </div>
                                  {user.username && (
                                    <span className="text-xs text-muted-foreground">
                                      @{user.username}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {!searchResults?.roles?.length &&
                        !searchResults?.users?.length && (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            <TranslateText value="servers.category.noResultsFound" />
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </form>
          </Form>
        </div>
        <div className="justify-between flex items-center gap-2 mt-3">
          <Button
            className="w-1/2 bg-muted-foreground/5 hover:bg-accent-foreground/5"
            variant={'ghost'}
            onClick={() => closeModal('ModalCreateCategory')}
          >
            <TranslateText value="common.cancel" />
          </Button>
          <Button
            className="flex-1"
            loading={pending || createChannelForm.formState.isSubmitting}
            disabled={pending || createChannelForm.formState.isSubmitting}
            onClick={createChannelForm.handleSubmit(onSubmit)}
          >
            <TranslateText
              value={isPrivate ? 'common.next' : 'servers.category.create'}
            />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateCategory;
