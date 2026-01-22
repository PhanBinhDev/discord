'use client';

import { ModalCreateServer } from '@/components/modals/modal-create-server';
import useModal from '@/hooks/use-modal';
import { useEffect, useState } from 'react';

const ModalsProvider = () => {
  const { isModalOpen } = useModal();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return <>{isModalOpen('ModalCreateServer') && <ModalCreateServer />}</>;
};

export default ModalsProvider;
