import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import useModal from '@/hooks/use-modal';
import { ConfirmDialog } from './confirm';
import { toast } from 'sonner';
import { useClientDictionary } from '@/hooks/use-client-dictionary';

const ModalRemoveCategory = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { category } = getModalData('ModalDeleteCategory') as {
    category: Doc<'channelCategories'>;
  };

  const { mutate: deleteCategory, pending: isDeleting } = useApiMutation(
    api.servers.deleteCategory,
  );

  const onConfirmDelete = () => {
    deleteCategory({
      categoryId: category._id,
      deleteChannels: false,
    }).then(() => {
      toast.success(dict?.servers?.category?.delete?.success);
      closeModal('ModalDeleteCategory');
    }).catch(() => { 
      toast.error(dict?.servers?.category?.delete?.error);
    });
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
      onConfirm={onConfirmDelete}
      loading={isDeleting}
    />
  );
};

export default ModalRemoveCategory;
