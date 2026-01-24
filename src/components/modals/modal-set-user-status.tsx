import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusExpiredOptions, StatusMappingField } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { UserStatus } from '@/convex/schema';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { cn, convertTimeTextToNumber, getUserStatusStyle } from '@/lib/utils';
import { StatusExpiredValue, StatusMapping } from '@/types';
import { getIconUserStatus } from '@/utils/helper';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ModalSetUserStatus = () => {
  const { dict } = useClientDictionary();
  const { closeModal, isModalOpen, getModalData } = useModal();
  const [selectStatus, setSelectStatus] = useState<UserStatus>('online');
  const [selectExpiration, setSelectExpiration] =
    useState<StatusExpiredValue>('never');

  const { status } = getModalData('ModalSetUserStatus') as {
    status: UserStatus;
  };

  const { mutate: updateUser, pending } = useApiMutation(api.users.updateUser);

  useEffect(() => {
    if (status) {
      setSelectStatus(status);
    }
  }, [status]);

  const handleSave = () => {
    updateUser({
      status: selectStatus,
      statusExpiration: convertTimeTextToNumber(selectExpiration),
      customStatus: selectStatus === 'online' ? '' : 'other',
    })
      .then(() => {
        toast.success(dict?.servers.userStatus.updateSuccess);
        closeModal('ModalSetUserStatus');
      })
      .catch(() => {
        toast.error(dict?.servers.userStatus.updateFailed);
      });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalSetUserStatus')}
      open={isModalOpen('ModalSetUserStatus')}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <TranslateText value="servers.userStatus.setStatus" />
          </DialogTitle>
          <DialogDescription>
            <TranslateText value="servers.userStatus.description" />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {StatusMappingField.map(({ label, value }: StatusMapping) => {
            const isActive = value === selectStatus;
            const IconStatus = getIconUserStatus(value);
            const style = getUserStatusStyle(value);
            return (
              <Button
                className={cn(
                  'flex gap-1.5 rounded-md justify-start hover:bg-muted-foreground/15 w-full',
                  isActive ? 'bg-muted-foreground/20' : '',
                )}
                key={value}
                variant="ghost"
                onClick={() => setSelectStatus(value)}
              >
                <IconStatus className={cn('size-4', style)} />
                <TranslateText value={label} />
              </Button>
            );
          })}
        </div>
        {selectStatus !== 'online' && (
          <Select
            value={selectExpiration}
            onValueChange={(value: StatusExpiredValue) =>
              setSelectExpiration(value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={dict?.servers.userStatus.time.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  <TranslateText value="servers.userStatus.time.title" />
                </SelectLabel>
                {StatusExpiredOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <TranslateText value={option.label} />
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => closeModal('ModalSetUserStatus')}
          >
            <TranslateText value="common.close" />
          </Button>
          <Button disabled={pending} loading={pending} onClick={handleSave}>
            <TranslateText value="common.save" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalSetUserStatus;
