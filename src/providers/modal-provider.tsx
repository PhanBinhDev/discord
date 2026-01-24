'use client';

import ModalCreateDirectMessage from '@/components/modals/modal-create-direct-message';
import { ModalCreateServer } from '@/components/modals/modal-create-server';
import ModalSetUserStatus from '@/components/modals/modal-set-user-status';
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
    </>
  );
};

export default ModalsProvider;
