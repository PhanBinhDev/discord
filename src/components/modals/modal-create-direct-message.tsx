import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useModal from '@/hooks/use-modal';

const ModalCreateDirectMessage = () => {
  const { closeModal, isModalOpen, getModalData } = useModal();

  const { hasFriends } = getModalData('ModalCreateDirectMessage') || {
    hasFriends: false,
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateDirectMessage')}
      open={isModalOpen('ModalCreateDirectMessage')}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.directMessage.selectFriend" />
          </DialogTitle>
          {!hasFriends && (
            <DialogDescription className="pt-2">
              <TranslateText value="servers.directMessage.noFriends" />
            </DialogDescription>
          )}
        </DialogHeader>

        {!hasFriends ? (
          <Button
            className="w-full bg-(--accent-color) hover:bg-(--accent-hover) text-white"
            onClick={() => closeModal('ModalCreateDirectMessage')}
          >
            <TranslateText value="servers.directMessage.addFriend.title" />
          </Button>
        ) : (
          <div>Friend list here</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateDirectMessage;
