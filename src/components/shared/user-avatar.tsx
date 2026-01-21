import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DEFAULT_NAME_TEAMMATE } from '@/constants/app';
import { getInitials } from '@/utils';

interface UserAvatarProps {
  src?: string;
  name?: string;
  fallback?: string;
  borderColor?: string;
  size?: number;
  showTooltip?: boolean;
}

const UserAvatar = ({
  src,
  name,
  fallback,
  borderColor,
  size = 9,
  showTooltip = true,
}: UserAvatarProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar
          className={`size-${size} border-2`}
          style={{
            borderColor,
          }}
        >
          <AvatarImage src={src} alt={name} />
          <AvatarFallback className="text-xs font-semibold">
            {fallback || getInitials(name || DEFAULT_NAME_TEAMMATE)}
          </AvatarFallback>
        </Avatar>
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
