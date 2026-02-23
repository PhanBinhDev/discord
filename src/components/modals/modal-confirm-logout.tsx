import useModal from '@/hooks/use-modal';
import { useAuth } from '@clerk/nextjs';
import { ConfirmDialog } from './confirm';

const ModalConfirmLogout = () => {
  const { isModalOpen, closeModal } = useModal();
  const { signOut } = useAuth();

  const onConfirmDelete = () => {
    signOut();
    closeModal('ModalConfirmLogout');
    closeModal('ModalSettingsUser');
  };

  return (
    <ConfirmDialog
      open={isModalOpen('ModalConfirmLogout')}
      onOpenChange={() => closeModal('ModalConfirmLogout')}
      title={{
        value: 'settings.logoutConfirm.title',
      }}
      description={{
        value: 'settings.logoutConfirm.description',
      }}
      onConfirm={onConfirmDelete}
      variant="destructive"
    />
  );
};

export default ModalConfirmLogout;
