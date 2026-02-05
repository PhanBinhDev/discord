import { Doc } from '@/convex/_generated/dataModel';
import useModal from '@/hooks/use-modal';
import { ConfirmDialog } from './confirm';

const ModalRemoveCategory = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { category } = getModalData('ModalDeleteCategory') as {
    category: Doc<'channelCategories'>;
  };

  return (
    <ConfirmDialog
      open={isModalOpen('ModalDeleteCategory')}
      onOpenChange={() => closeModal('ModalDeleteCategory')}
      title={{
        value: 'servers.category.delete.title',
      }}
      description={{
        value: 'servers.category.delete.description',
        params: { categoryName: category.name },
      }}
      onConfirm={() => {}}
    />
  );
};

export default ModalRemoveCategory;
