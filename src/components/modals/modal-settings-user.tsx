import { Dialog, DialogContent } from '@/components/ui/dialog';
import useModal from '@/hooks/use-modal';

const ModalSettingsUser = () => {
  const { closeModal, isModalOpen } = useModal();

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalSettingsUser')}
      open={isModalOpen('ModalSettingsUser')}
    >
      <DialogContent className="sm:max-w-md"></DialogContent>
    </Dialog>
  );
};

export default ModalSettingsUser;
