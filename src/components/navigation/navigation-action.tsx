'use client';

import { Hint } from '@/components/ui/hint';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { IconCirclePlusFilled } from '@tabler/icons-react';

export function NavigationAction() {
  const { openModal } = useModal();
  const { dict } = useClientDictionary();

  return (
    <Hint
      side="right"
      align="center"
      sideOffset={4}
      label={dict?.nav.createServer}
    >
      <div className="flex items-center justify-center">
        <button
          onClick={() => openModal('ModalCreateServer')}
          className="group flex items-center cursor-pointer"
        >
          <div
            className="flex size-10 md:size-11 rounded-lg overflow-hidden items-center justify-center bg-background dark:bg-neutral-700"
            style={{
              ['--tw-bg-opacity' as string]: '1',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            <IconCirclePlusFilled className="transition fill-white" size={25} />
          </div>
        </button>
      </div>
    </Hint>
  );
}
