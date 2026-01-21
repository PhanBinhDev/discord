'use client';

import useModal from '@/hooks/use-modal';
import { useEffect, useState } from 'react';

const Modals = () => {
  const {} = useModal();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return <></>;
};

export default Modals;
