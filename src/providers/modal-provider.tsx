'use client';

import ModalActionInvite from '@/components/modals/modal-action-invite';
import ModalAddMemberRoles from '@/components/modals/modal-add-members-roles';
import ModalCreateCategory from '@/components/modals/modal-create-category';
import ModalCreateChannel from '@/components/modals/modal-create-channel';
import ModalCreateDirectMessage from '@/components/modals/modal-create-direct-message';
import ModalCreateInviteChannel from '@/components/modals/modal-create-invite-channel';
import { ModalCreateServer } from '@/components/modals/modal-create-server';
import ModalEditCategory from '@/components/modals/modal-edit-category';
import ModalEditChannel from '@/components/modals/modal-edit-channel';
import ModalInvitePeople from '@/components/modals/modal-invite-people';
import ModalRemoveCategory from '@/components/modals/modal-remove-category';
import ModalRemoveChannel from '@/components/modals/modal-remove-channel';
import ModalSetUserStatus from '@/components/modals/modal-set-user-status';
import ModalUploadFile from '@/components/modals/modal-upload-file';
import ModalUserDetails from '@/components/modals/modal-user-details';
import useModal from '@/hooks/use-modal';
import { useEffect, useState } from 'react';

const ModalsProvider = () => {
  const { isModalOpen } = useModal();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      {isModalOpen('ModalCreateServer') && <ModalCreateServer />}
      {isModalOpen('ModalCreateDirectMessage') && <ModalCreateDirectMessage />}
      {isModalOpen('ModalSetUserStatus') && <ModalSetUserStatus />}
      {isModalOpen('ModalInvitePeople') && <ModalInvitePeople />}
      {isModalOpen('ModalCreateChannel') && <ModalCreateChannel />}
      {isModalOpen('ModalCreateCategory') && <ModalCreateCategory />}
      {isModalOpen('ModalDeleteCategory') && <ModalRemoveCategory />}
      {isModalOpen('ModalEditCategory') && <ModalEditCategory />}
      {isModalOpen('ModalAddMemberRoles') && <ModalAddMemberRoles />}
      {isModalOpen('ModalEditChannel') && <ModalEditChannel />}
      {isModalOpen('ModalDeleteChannel') && <ModalRemoveChannel />}
      {isModalOpen('ModalCreateInviteChannel') && <ModalCreateInviteChannel />}
      {isModalOpen('ModalActionInvite') && <ModalActionInvite />}
      {isModalOpen('ModalUserDetails') && <ModalUserDetails />}
      {isModalOpen('ModalUploadFile') && <ModalUploadFile />}
    </>
  );
};

export default ModalsProvider;
