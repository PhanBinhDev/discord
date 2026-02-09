import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { ActionInvite, ActionInviteConfig } from '@/types';
import { toast } from 'sonner';
import { ConfirmDialog } from './confirm';

const ModalActionInvite = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const { inviteId, type } = getModalData('ModalActionInvite') as {
    inviteId: Id<'serverInvites'>;
    type: ActionInvite;
  };

  const { mutate: revokeInvite, pending: isRevoking } = useApiMutation(
    api.servers.revokeInvite,
  );

  const { mutate: activateInvite, pending: isActivating } = useApiMutation(
    api.servers.activateInvite,
  );

  const { mutate: deleteInvite, pending: isDeleting } = useApiMutation(
    api.servers.deleteInvite,
  );

  const onConfirm = () => {
    const actions = {
      revoke: {
        mutate: revokeInvite,
        success: dict?.servers.channel.edit.invite.revokeSuccess,
        error: dict?.servers.channel.edit.invite.revokeError,
      },
      activate: {
        mutate: activateInvite,
        success: dict?.servers.channel.edit.invite.activateSuccess,
        error: dict?.servers.channel.edit.invite.activateError,
      },
      delete: {
        mutate: deleteInvite,
        success: dict?.servers.channel.edit.invite.deleteSuccess,
        error: dict?.servers.channel.edit.invite.deleteError,
      },
    };

    const selectedAction = actions[type];
    selectedAction
      .mutate({ inviteId })
      .then(() => {
        closeModal('ModalActionInvite');
        toast.success(selectedAction.success);
      })
      .catch(() => {
        toast.error(selectedAction.error);
      });
  };

  const config: Record<ActionInvite, ActionInviteConfig> = {
    revoke: {
      title: 'servers.channel.edit.invite.revokeTitle',
      description: 'servers.channel.edit.invite.revokeDescription',
      variant: 'destructive',
    },
    activate: {
      title: 'servers.channel.edit.invite.activateTitle',
      description: 'servers.channel.edit.invite.activateDescription',
      variant: 'default',
    },
    delete: {
      title: 'servers.channel.edit.invite.deleteTitle',
      description: 'servers.channel.edit.invite.deleteDescription',
      variant: 'destructive',
    },
  };

  const currentConfig = config[type];
  const isPending = isRevoking || isActivating || isDeleting;

  return (
    <ConfirmDialog
      open={isModalOpen('ModalActionInvite')}
      onOpenChange={() => closeModal('ModalActionInvite')}
      title={{
        value: currentConfig.title,
      }}
      description={{
        value: currentConfig.description,
      }}
      onConfirm={onConfirm}
      loading={isPending}
      variant={currentConfig.variant}
    />
  );
};

export default ModalActionInvite;
