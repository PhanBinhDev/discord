import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { DictKey } from '@/internationalization/get-dictionaries';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface SnackbarUnsavedProps {
  open: boolean;
  onDiscard: () => void;
  onSave: () => void;
  loading?: boolean;
  shake?: boolean;
  discardText?: DictKey;
  saveText?: DictKey;
  message?: DictKey;
}

export const SnackbarUnsaved = ({
  open,
  onDiscard,
  onSave,
  loading = false,
  shake = false,
  discardText = 'common.discard',
  saveText = 'common.saveChanges',
  message = 'common.unsavedChanges',
}: SnackbarUnsavedProps) => {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 1 }}
          animate={
            shake
              ? {
                  y: 0,
                  opacity: 1,
                  x: [0, -10, 10, -10, 10, 0],
                }
              : { y: 0, opacity: 1 }
          }
          exit={{ y: 100, opacity: 1 }}
          transition={
            shake
              ? {
                  x: { duration: 0.4, ease: 'easeInOut' },
                }
              : { type: 'spring', damping: 25, stiffness: 300 }
          }
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-9999"
          style={{ pointerEvents: 'auto' }}
          data-snackbar-unsaved
        >
          <div
            className={cn(
              'bg-var(--accent-color) border border-var(--accent-color)/30 backdrop-blur-xl',
              'rounded-lg shadow-2xl px-4 py-3',
              'flex items-center gap-4',
              'min-w-[400px] max-w-3xl',
            )}
          >
            <span className="text-sm font-medium text-var(--accent-color) flex-1 shrink-0">
              <TranslateText value={message} />
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={loading}
                className="text-sm cursor-pointer hover:underline"
              >
                <TranslateText value={discardText} />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                loading={loading}
                disabled={loading}
                className="text-sm cursor-pointer"
              >
                <TranslateText value={saveText} />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
