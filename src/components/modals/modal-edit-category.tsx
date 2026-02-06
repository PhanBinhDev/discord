'use client';

import SelectEmoji from '@/components/shared/select-emoji';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryManageNavItems } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { createCategorySchema } from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Fragment, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalEditCategory = () => {
  const { isModalOpen, closeModal, openModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { category } = getModalData('ModalEditCategory') as {
    category: Doc<'channelCategories'>;
  };

  const form = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: category?.name || '',
      isPrivate: category?.isPrivate || false,
    },
  });

  const { mutate: updateCategory, pending } = useApiMutation(
    api.servers.updateCategory,
  );

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        isPrivate: category.isPrivate,
      });
    }
  }, [category, form]);

  const onSubmit = (values: { name: string; isPrivate: boolean }) => {
    updateCategory({
      categoryId: category._id,
      name: values.name,
    })
      .then(() => {
        toast.success(dict?.servers.category.edit.success);
        closeModal('ModalEditCategory');
      })
      .catch(() => {
        toast.error(dict?.servers.category.edit.error);
      });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalEditCategory')}
      open={isModalOpen('ModalEditCategory')}
    >
      <DialogContent className="sm:max-w-6xl h-[95vh] p-0 overflow-hidden">
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
                          className="w-full p-2 gap-1.5 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center"
                          variant={'ghost'}
                          onClick={() => {
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
            <TabsContent value="general" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  <TranslateText value="servers.category.edit.general.title" />
                </h3>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
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
                                    form.setValue('name', `${prev}${e.native}`);
                                  }}
                                />
                              </InputGroupAddon>
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => form.reset()}
                        disabled={pending}
                      >
                        <TranslateText value="common.reset" />
                      </Button>
                      <Button
                        type="submit"
                        loading={pending}
                        disabled={pending || !form.formState.isDirty}
                      >
                        <TranslateText value="common.save" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </TabsContent>
            <TabsContent value="permissions">
              <h3 className="text-lg font-semibold mb-4">
                <TranslateText value="servers.category.edit.permissions.title" />
              </h3>
              <p className="text-sm text-muted-foreground">
                <TranslateText value="servers.category.edit.permissions.description" />
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ModalEditCategory;
