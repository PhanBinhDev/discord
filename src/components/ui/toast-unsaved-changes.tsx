'use client';

import { toast } from 'sonner';
import TranslateText from '../shared/translate/translate-text';
import { Button } from './button';

interface UnsavedChangesToastProps {
  onDiscard: () => void;
  onSave: () => void;
}

export const showUnsavedChangesToast = ({
  onDiscard,
  onSave,
}: UnsavedChangesToastProps) => {
  return toast.custom(
    t => (
      <div
        className="bg-[#2f3136] border border-[#202225] rounded-md shadow-2xl p-3 flex items-center justify-between gap-4 min-w-[420px] animate-in slide-in-from-bottom-5 duration-200"
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <p className="text-white text-sm font-medium flex-1">
          <TranslateText value="common.unsavedChanges" />
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white h-8"
            onClick={() => {
              toast.dismiss(t);
              onDiscard();
            }}
          >
            <TranslateText value="common.discard" />
          </Button>
          <Button
            size="sm"
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white h-8"
            onClick={() => {
              toast.dismiss(t);
              onSave();
            }}
          >
            <TranslateText value="common.saveChanges" />
          </Button>
        </div>
      </div>
    ),
    {
      duration: Infinity,
      position: 'bottom-center',
      closeButton: false,
      className: 'unsaved-changes-toast',
    },
  );
};
