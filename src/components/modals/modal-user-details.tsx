import TranslateText from '@/components/shared/translate/translate-text';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserDetailsTabs } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import useModal from '@/hooks/use-modal';
import { ApiPaginatedReturn } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'radix-ui';
import { useMemo } from 'react';

const ModalUserDetails = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { user } = getModalData('ModalUserDetails') as {
    user: ApiPaginatedReturn<typeof api.friends.getFriends>;
  };

  const { data: commonCounts } = useQuery(
    convexQuery(api.users.getCommonDetails, { targetUserId: user.user._id }),
  );
  const tabs = useMemo(() => {
    return getUserDetailsTabs({
      commonFriends: commonCounts?.commonFriends,
      commonServers: commonCounts?.commonServers,
    });
  }, [commonCounts]);

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalUserDetails')}
      open={isModalOpen('ModalUserDetails')}
    >
      <DialogContent
        className="sm:max-w-5xl h-[84vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>
            <TranslateText value="servers.userDetails.title" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.userDetails.description" />
          </DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-6 flex gap-2">
          <Card className="w-[400px]"></Card>
          <Tabs defaultValue="activity" className="flex-1">
            <TabsList className="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0 border-b border-border pb-2">
              {tabs.map(tab => {
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="relative h-auto cursor-pointer rounded-md border-0 bg-transparent px-2.5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    <TranslateText {...tab.label} />
                    <span className="pointer-events-none absolute -bottom-px left-0 right-0 h-1 bg-transparent data-[state=active]:bg-(--accent-color)" />
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="activity">Content</TabsContent>
            <TabsContent value="friend">B</TabsContent>
            <TabsContent value="server">C</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalUserDetails;
