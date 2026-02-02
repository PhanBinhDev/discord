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
import { Switch } from '@/components/ui/switch';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import {
  CreateCategoryFormValues,
  createCategorySchema,
} from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconShieldLockFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const ModalCreateCategory = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const [step, setStep] = useState(1);

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

  const { mutate: createCategory, pending } = useApiMutation(
    api.servers.createCategory,
  );

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
    });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateCategory')}
      open={isModalOpen('ModalCreateCategory')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.category.title" />
          </DialogTitle>
          <DialogDescription className="pt-2">
            <TranslateText value="servers.category.description" />
          </DialogDescription>
        </DialogHeader>
        <div>
          <Form {...createChannelForm}>
            <form
              onSubmit={createChannelForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
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
                      <InputGroup>
                        <InputGroupInput
                          placeholder={
                            dict?.servers.category.categoryNamePlaceholder
                          }
                          {...field}
                        />
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
            <TranslateText value="servers.category.create" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateCategory;
