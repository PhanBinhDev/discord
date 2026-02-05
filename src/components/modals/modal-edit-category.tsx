'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import useModal from '@/hooks/use-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const ModalEditCategory = () => {
  const { isModalOpen, closeModal } = useModal();

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalEditCategory')}
      open={isModalOpen('ModalEditCategory')}
    >
      <DialogContent className="sm:max-w-6xl h-[95vh]">
        <Tabs
          defaultValue="account"
          orientation="vertical"
          className="flex flex-row"
        >
          <TabsList className="flex flex-col min-w-[200px]">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="account">Account Content</TabsContent>
          <TabsContent value="password">Password Content</TabsContent>
          <TabsContent value="notifications">Notifications Content</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ModalEditCategory;
