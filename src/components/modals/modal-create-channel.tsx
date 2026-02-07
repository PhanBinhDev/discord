'use client';

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ChannelTypeOptionsList } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import {
  CreateChannelFormValues,
  createChannelSchema,
} from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconShieldLockFilled } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ModalCreateChannel = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const data = getModalData('ModalCreateChannel') as {
    category: Doc<'channelCategories'>;
    server: Doc<'servers'>;
    type: 'category' | undefined;
  };

  const { mutate: createChannel, pending } = useApiMutation(
    api.servers.createChannel,
  );

  const createChannelForm = useForm({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: '',
      isPrivate: false,
      type: 'text',
    },
  });

  const onSubmit = (values: CreateChannelFormValues) => {
    const payload = {
      name: values.name,
      serverId:
        data?.type === 'category' ? data.category?.serverId : data.server?._id,
      categoryId: data.category ? data.category._id : undefined,
      type: values.type,
      isPrivate: values.isPrivate,
    };

    createChannel(payload)
      .then(() => {
        toast.success(dict?.servers.channel.channelCreated);
        closeModal('ModalCreateChannel');
      })
      .catch(() => {
        toast.error(dict?.servers.channel.createError);
      });
  };

  const isPrivate = createChannelForm.watch('isPrivate');
  const channelType = createChannelForm.watch('type');

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateChannel')}
      open={isModalOpen('ModalCreateChannel')}
    >
      <DialogContent className="sm:max-w-lg">
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
                        className="max-w-lg"
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
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          placeholder={
                            dict?.servers.channel.channelNamePlaceholder[
                              channelType
                            ]
                          }
                          {...field}
                        />
                        <InputGroupAddon>
                          {(() => {
                            const IconComponent = ChannelTypeOptionsList.find(
                              option => option.value === channelType,
                            )?.icon(!!isPrivate);
                            return IconComponent ? (
                              <IconComponent className="size-4 text-muted-foreground" />
                            ) : null;
                          })()}
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end" className="pr-2">
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
                        <TranslateText value="servers.channel.privateChannel" />
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <TranslateText value="servers.channel.privateChannelDescription" />
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
            </form>
          </Form>
        </div>

        <div className="justify-between flex items-center gap-2 mt-3">
          <Button
            className="w-1/2 bg-muted-foreground/5 hover:bg-accent-foreground/5"
            variant={'ghost'}
            onClick={() => closeModal('ModalCreateChannel')}
          >
            <TranslateText value="common.cancel" />
          </Button>
          <Button
            className="flex-1"
            loading={pending || createChannelForm.formState.isSubmitting}
            disabled={pending || createChannelForm.formState.isSubmitting}
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
