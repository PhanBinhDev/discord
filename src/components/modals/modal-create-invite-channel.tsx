'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Hint } from '@/components/ui/hint';
import { Input } from '@/components/ui/input';
import { APP_URL } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { ChannelWithCategory } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import {
  IconCopy,
  IconCopyCheckFilled,
  IconSettings,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

const ModalCreateInviteChannel = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const [copied, setCopied] = useState(false);
  const { channel, serverId } = getModalData('ModalCreateInviteChannel') as {
    channel: ChannelWithCategory;
    serverId: Id<'servers'>;
    alreadyHasInviteLink?: boolean;
  };

  const { data: server } = useQuery({
    ...convexQuery(api.servers.getServerById, {
      serverId,
    }),
    enabled: isModalOpen('ModalCreateInviteChannel') && !!serverId,
  });

  const [neverExpire, setNeverExpire] = useState(false);
  const [inviteLink] = useState(APP_URL);

  const handleCopy = () => {
    if (!inviteLink || copied) return;

    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success(dict?.servers.invite.copied);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalCreateInviteChannel')}
      open={isModalOpen('ModalCreateInviteChannel')}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {dict?.servers.invite.modal.title?.replace(
              '{{serverName}}',
              server?.name || '',
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {dict?.servers.invite.modal.recipients?.replace(
              '{{channel}}',
              channel?.name || '',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <p className="text-sm font-medium">
            <TranslateText value="servers.invite.modal.shareLink" />
          </p>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1 bg-muted/50 border-input/50"
              />
              <Hint label={dict?.servers.invite.copyLink} sideOffset={3}>
                <Button
                  onClick={handleCopy}
                  size="icon"
                  variant="ghost"
                  className="border border-muted-foreground/10 hover:bg-muted-foreground/15"
                >
                  {copied ? (
                    <IconCopyCheckFilled className="size-4" />
                  ) : (
                    <IconCopy className="size-4" />
                  )}
                </Button>
              </Hint>
            </div>

            <p className="text-sm text-muted-foreground">
              <TranslateText value="servers.invite.modal.expiresIn" />
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-input/50 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Checkbox
                id="never-expire"
                checked={neverExpire}
                className="cursor-pointer"
                onCheckedChange={checked => setNeverExpire(checked as boolean)}
              />
              <label
                htmlFor="never-expire"
                className="text-sm font-medium cursor-pointer select-none"
              >
                <TranslateText value="servers.invite.modal.neverExpire" />
              </label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <IconSettings className="size-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCreateInviteChannel;
