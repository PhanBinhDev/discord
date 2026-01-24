import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DEFAULT_NAME_TEAMMATE } from '@/constants/app';
import { UserStatus } from '@/convex/schema';
import { cn, getUserStatusStyle } from '@/lib/utils';
import { getInitials } from '@/utils';
import { getIconUserStatus } from '@/utils/helper';

interface UserAvatarProps {
  src?: string;
  name?: string;
  fallback?: string;
  borderColor?: string;
  size?: number;
  showTooltip?: boolean;
  border?: boolean;
  status?: UserStatusIconProps;
}

interface UserStatusIconProps {
  size: number;
  status?: UserStatus;
  position?: string;
}

const UserAvatar = ({
  src,
  name,
  fallback,
  borderColor,
  size = 9,
  showTooltip = true,
  border = true,
  status,
}: UserAvatarProps) => {
  const Icon = status ? getIconUserStatus(status.status) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          <Avatar
            className={`size-${size} ${border ? 'border-2' : ''}`}
            style={{
              borderColor,
            }}
          >
            <AvatarImage src={src} alt={name} />
            <AvatarFallback className="text-xs font-semibold">
              {fallback || getInitials(name || DEFAULT_NAME_TEAMMATE)}
            </AvatarFallback>
          </Avatar>
          {Icon && (
            <div className={cn('absolute bottom-0 right-0', status?.position)}>
              <Icon
                className={cn(
                  `size-${status?.size || 4}`,
                  getUserStatusStyle(status?.status),
                )}
              />
            </div>
          )}
        </div>
      </TooltipTrigger>
      {showTooltip && (
        <TooltipContent side="bottom" sideOffset={5}>
          {name || DEFAULT_NAME_TEAMMATE}
        </TooltipContent>
      )}
    </Tooltip>
  );
};

export default UserAvatar;
