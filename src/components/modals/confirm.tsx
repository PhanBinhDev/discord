import TranslateText from '@/components/shared/translate/translate-text';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DictKey } from '@/internationalization/get-dictionaries';
import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: DictKey;
  description: DictKey;
  confirmText?: DictKey;
  cancelText?: DictKey;
  variant?: 'default' | 'destructive';
  requireConfirmation?: {
    text: string;
    label?: DictKey;
    placeholder?: DictKey;
  };
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'common.confirm',
  cancelText = 'common.cancel',
  variant = 'default',
  requireConfirmation,
  loading,
}: ConfirmDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const handleConfirm = () => {
    onConfirm();
    setConfirmationInput('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmationInput('');
    }
    onOpenChange(isOpen);
  };

  const isConfirmEnabled = requireConfirmation
    ? confirmationInput === requireConfirmation.text
    : true;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <TranslateText value={title} />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <TranslateText value={description} />
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmation && (
          <div className="space-y-2 py-4">
            <Label htmlFor="confirmation">
              <TranslateText
                value={requireConfirmation.label || 'common.typeToConfirm'}
                params={{
                  text: requireConfirmation.text,
                }}
              />
            </Label>
            <Input
              id="confirmation"
              value={confirmationInput}
              onChange={e => setConfirmationInput(e.target.value)}
              placeholder={requireConfirmation.placeholder}
              className="font-mono"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>
            <TranslateText value={cancelText} />
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            variant={variant}
            disabled={!isConfirmEnabled}
            loading={loading}
          >
            <TranslateText value={confirmText} />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
