import { IconUser } from '@tabler/icons-react';
import { NotificationBell } from './notification-bell';

const TopHeader = () => {
  return (
    <div className="h-9 bg-background flex items-center justify-between px-3">
      <div />
      <div className="pl-6.5 text-sm font-medium">
        <IconUser className="inline-block mr-2 text-(--accent-color) size-4" />
        Bạn bè
      </div>
      <NotificationBell size="small" />
    </div>
  );
};

export default TopHeader;
