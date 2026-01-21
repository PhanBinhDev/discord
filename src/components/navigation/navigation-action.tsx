'use client';

import { Plus } from 'lucide-react';

import { Hint } from '@/components/ui/hint';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';

export function NavigationAction() {
  const { openModal } = useModal();
  const { dict } = useClientDictionary();

  return (
    <div>
      <Hint side="right" align="center" label={dict?.nav.createServer}>
        <button
          onClick={() => openModal('ModalCreateServer')}
          className="group flex items-center cursor-pointer"
        >
          <div className="flex mx-3 size-12 rounded-3xl group-hover:rounded-2xl transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 group-hover:bg-emerald-500">
            <Plus
              className="group-hover:text-white transition text-emerald-500"
              size={25}
            />
          </div>
        </button>
      </Hint>
    </div>
  );
}
