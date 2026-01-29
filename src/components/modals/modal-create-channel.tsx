'use client';

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
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChannelTypeOptionsList } from '@/constants/app';
import { Doc } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import {
  CreateChannelFormValues,
  createChannelSchema,
} from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Switch } from '../ui/switch';

const ModalCreateChannel = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();

  const { dict } = useClientDictionary();
  const data = getModalData('ModalCreateChannel') as {
    category?: Doc<'channelCategories'>;
  };

  const createChannelForm = useForm({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: '',
      isPrivate: false,
      type: 'text',
    },
  });

  const onSubmit = (values: CreateChannelFormValues) => {
    console.log(values);
  };

  const isPrivate = createChannelForm.watch('isPrivate');
  const channelType = createChannelForm.watch('type');

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateChannel')}
      open={isModalOpen('ModalCreateChannel')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.channel.title" />
          </DialogTitle>
          <DialogDescription className="pt-2">
            {data.category ? (
              <TranslateText
                value="servers.channel.inCategory"
                params={{
                  category: data.category.name,
                }}
              />
            ) : (
              <TranslateText value="servers.channel.description" />
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            <TranslateText value="servers.channel.channelType" />
          </h3>

          <Form {...createChannelForm}>
            <form
              onSubmit={createChannelForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createChannelForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="max-w-md"
                      >
                        {ChannelTypeOptionsList.map(option => {
                          const Icon = option.icon(!!isPrivate);

                          return (
                            <FieldLabel
                              key={option.value}
                              htmlFor={`${option.value}`}
                            >
                              <Field className="p-3!" orientation="horizontal">
                                <FieldContent>
                                  <FieldTitle>
                                    <Icon className="size-5" />
                                    <TranslateText value={option.label} />
                                  </FieldTitle>
                                  <FieldDescription>
                                    <TranslateText value={option.desc} />
                                  </FieldDescription>
                                </FieldContent>
                                <RadioGroupItem
                                  value={option.value}
                                  id={`${option.value}`}
                                />
                              </Field>
                            </FieldLabel>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createChannelForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <TranslateText value="servers.channel.channelName" />{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          dict?.servers.channel.channelNamePlaceholder[
                            channelType
                          ]
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createChannelForm.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4 bg-background/60 dark:bg-black/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        <TranslateText value="servers.channel.privateChannel" />
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <TranslateText value="servers.channel.privateChannelDescription" />
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
            </form>
          </Form>
        </div>

        <div className="justify-between flex items-center gap-2">
          <Button
            className="w-1/2 bg-muted-foreground/5 hover:bg-accent-foreground/5"
            variant={'ghost'}
            onClick={() => closeModal('ModalCreateChannel')}
          >
            <TranslateText value="common.cancel" />
          </Button>
          <Button
            className="flex-1"
            onClick={createChannelForm.handleSubmit(onSubmit)}
          >
            <TranslateText value="servers.channel.create" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateChannel;
