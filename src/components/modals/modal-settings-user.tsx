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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsUserNavItems } from '@/constants/app';
import useModal from '@/hooks/use-modal';
import { DictKey } from '@/internationalization/get-dictionaries';
import { getUpdateChannelSchema } from '@/validations/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconX } from '@tabler/icons-react';
import { VisuallyHidden } from 'radix-ui';
import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import UserAvatar from '../shared/user-avatar';

const ModalSettingsUser = () => {
  const { closeModal, isModalOpen, openModal } = useModal();

  const form = useForm({
    resolver: zodResolver(getUpdateChannelSchema()),
  });

  const onSubmit = () => {};

  const renderHeaderTab = (title: DictKey) => (
    <div className="p-3 border-b border-muted-foreground/10 flex items-center justify-between">
      <h3 className="text-md font-semibold">
        <TranslateText value={title} />
      </h3>
      <Button
        size="icon-sm"
        onClick={() => {
          closeModal('ModalSettingsUser');
        }}
        variant={'ghost'}
        className="hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconX />
        <span className="sr-only">
          <TranslateText value="common.close" />
        </span>
      </Button>
    </div>
  );

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalSettingsUser')}
      open={isModalOpen('ModalSettingsUser')}
    >
      <DialogContent
        className="sm:max-w-6xl h-[95vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>
            <TranslateText value="settings.user.title" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="settings.user.description" />
          </DialogDescription>
        </VisuallyHidden.Root>
        <Tabs
          defaultValue="general"
          orientation="vertical"
          className="flex flex-row h-full gap-0"
        >
          <div className="flex flex-col min-w-[200px] border-r border-muted-foreground/10 bg-muted/30 h-full">
            <div className="w-full p-2 flex flex-col">
              <div className="flex">
                <UserAvatar
                  src={}
                />
              </div>
            </div>
            <TabsList className="flex flex-col w-full rounded-none p-4 bg-transparent gap-1 h-auto">
              {SettingsUserNavItems.map((item, index) => {
                const Icon = item.icon;
                const isLogout = item.key === 'logout';
                const prevItem =
                  index > 0 ? SettingsUserNavItems[index - 1] : null;
                const showGroupTitle =
                  prevItem?.group !== item.group && item.group !== 'dangerZone';
                const groupTitleKey =
                  `settings.user.nav.${item.group}.title` as DictKey;

                return (
                  <Fragment key={item.key}>
                    {showGroupTitle && (
                      <>
                        {index > 0 && (
                          <Separator className="my-1 bg-muted-foreground/10" />
                        )}
                        <div className="px-2 pt-3 pb-1 text-xs font-semibold w-full text-start text-muted-foreground">
                          <TranslateText value={groupTitleKey} />
                        </div>
                      </>
                    )}
                    {isLogout ? (
                      <>
                        <Separator className="my-1 bg-muted-foreground/10" />
                        <Button
                          className="w-full p-2 px-2! gap-1.5 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center"
                          variant={'ghost'}
                          onClick={() => {
                            openModal('ModalConfirmLogout');
                          }}
                        >
                          <Icon className="size-4" />
                          <TranslateText value={item.label} />
                        </Button>
                      </>
                    ) : (
                      <TabsTrigger
                        value={item.key}
                        className={`w-full justify-start border-none p-2 hover:bg-muted-foreground/10 cursor-pointer${isLogout ? ' text-destructive' : ''}`}
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

          <div className="flex-1 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <TabsContent
                  value={SettingsUserNavItems[0].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[0].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[1].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[1].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[2].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[2].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[3].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[3].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[4].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[4].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[5].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[5].label)}
                </TabsContent>
                <TabsContent
                  value={SettingsUserNavItems[6].key}
                  className="space-y-4"
                >
                  {renderHeaderTab(SettingsUserNavItems[6].label)}
                </TabsContent>
              </form>
            </Form>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ModalSettingsUser;
