import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CUSTOM_USER_PROFILE_BANNER_HEIGHT } from '@/constants/app';
import { Doc } from '@/convex/_generated/dataModel';
import useModal from '@/hooks/use-modal';
import { DictKey } from '@/internationalization/get-dictionaries';
import { cn, getUserStatusStyle } from '@/lib/utils';
import { getIconUserStatus } from '@/utils/helper';
import { useAuth } from '@clerk/nextjs';
import { IconLogout, IconPencil, IconUserCircle } from '@tabler/icons-react';
import { ChevronRight } from 'lucide-react';

interface UserCardPopoverProps {
  user: Doc<'users'>;
}

const UserCardPopover = ({ user }: UserCardPopoverProps) => {
  const { openModal } = useModal();
  const { signOut } = useAuth();
  const IconStatus = getIconUserStatus(user.status!);
  const style = getUserStatusStyle(user.status!);

  return (
    <div className="flex flex-col gap-5">
      <div
        className="shrink-0 relative"
        style={{
          minHeight: `calc(${CUSTOM_USER_PROFILE_BANNER_HEIGHT}px + 35px)`,
        }}
      >
        {/* mask */}
        <div
          className="absolute inset-0 bg-linear-to-b from-yellow-500 to-yellow-600 rounded-t-lg"
          style={{
            height: `${CUSTOM_USER_PROFILE_BANNER_HEIGHT}px`,
          }}
        />

        <div className="absolute left-4 top-[61px] rounded-full border-4 border-background">
          <UserAvatar
            src={user.avatarUrl}
            name={user.displayName}
            showTooltip={false}
            size={20}
            border={false}
            status={{
              size: 8,
              status: user.status!,
              position: '-bottom-2 -right-2',
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 p-[4px_16px_8px_16px]">
        {/* Tên + username */}
        <div>
          <div className="text-lg font-semibold text-foreground leading-tight">
            {user.displayName}
          </div>
          <div className="text-sm text-foreground/60">
            {user.username}#{user.discriminator}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="p-2 flex flex-col bg-muted/80 rounded-md gap-2">
            <Button
              className="w-full justify-start hover:bg-muted-foreground/10 rounded-sm"
              variant={'ghost'}
            >
              <IconPencil className="size-4" />
              <TranslateText value="servers.settings.editProfile" />
            </Button>

            <Separator className="bg-muted-foreground/10" />

            <Button
              className="w-full justify-start hover:bg-muted-foreground/10 rounded-sm"
              variant={'ghost'}
              onClick={() =>
                openModal('ModalSetUserStatus', {
                  status: user.status,
                })
              }
            >
              <IconStatus className={cn('size-4', style)} />
              <TranslateText
                value={`common.status.${user.status}` as DictKey}
              />
              <ChevronRight className="size-4 text-foreground/60 ml-auto" />
            </Button>
          </div>
          <div className="p-2 flex flex-col bg-muted/80 rounded-md gap-2">
            <Button
              className="w-full justify-start hover:bg-muted-foreground/10 rounded-sm"
              variant={'ghost'}
            >
              <IconUserCircle className="size-4" />
              <TranslateText value="servers.settings.changeAccount" />
              <ChevronRight className="size-4 text-foreground/60 ml-auto" />
            </Button>
            <Separator className="bg-muted-foreground/10" />
            {/* Logout */}
            <Button
              className="w-full justify-start text-red-500 hover:bg-muted-foreground/10 hover:text-red-500 rounded-sm"
              variant={'ghost'}
              onClick={() => signOut()}
            >
              <IconLogout className="size-4 text-red-500" />
              <TranslateText value="settings.logout" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCardPopover;
