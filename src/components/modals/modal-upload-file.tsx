import { Pattern } from '@/components/patterns/upload';
import TranslateText from '@/components/shared/translate/translate-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useModal from '@/hooks/use-modal';
import { FileWithPreview } from '@/types';
import { VisuallyHidden } from 'radix-ui';

const ModalUploadFile = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();

  const { callback } = getModalData('ModalUploadFile') as {
    callback: (files: File | File[] | FileWithPreview[]) => void;
  };

  return (
    <Dialog
      open={isModalOpen('ModalUploadFile')}
      onOpenChange={() => closeModal('ModalUploadFile')}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>
              <TranslateText value="common.uploadFile.title" />
            </DialogTitle>
            <DialogDescription>
              <TranslateText value="common.uploadFile.description" />
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden.Root>
        <Pattern
          simulateUpload={false}
          multiple={true}
          onFilesChange={callback}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ModalUploadFile;
