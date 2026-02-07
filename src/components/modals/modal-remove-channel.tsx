import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { ChannelWithCategory } from '@/types';
import { toast } from 'sonner';
import { ConfirmDialog } from './confirm';

const ModalRemoveChannel = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { channel, callback } = getModalData('ModalDeleteChannel') as {
    channel: ChannelWithCategory;
    callback: () => void;
  };

  const { mutate: deleteChannel, pending: isDeleting } = useApiMutation(
    api.servers.deleteChannel,
  );

  const onConfirmDelete = () => {
    deleteChannel({
      channelId: channel._id,
    })
      .then(() => {
        toast.success(dict?.servers?.channel?.edit?.delete?.success);
        closeModal('ModalDeleteChannel');
        callback();
      })
      .catch(() => {
        toast.error(dict?.servers?.channel?.edit?.delete?.error);
      });
  };

  return (
    <ConfirmDialog
      open={isModalOpen('ModalDeleteChannel')}
      onOpenChange={() => closeModal('ModalDeleteChannel')}
      title={{
        value: 'servers.channel.edit.delete.title',
      }}
      description={{
        value: 'servers.channel.edit.delete.description',
        params: { channelName: channel.name },
      }}
      onConfirm={onConfirmDelete}
      loading={isDeleting}
      variant="destructive"
    />
  );
};

export default ModalRemoveChannel;
