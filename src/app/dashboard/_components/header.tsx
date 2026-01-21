import SearchGlobal from '@/components/search';
import { ChangeLanguage } from '@/components/shared/change-language';
import { UserMenu } from '@/components/shared/user-menu';
import { NotificationBell } from './notification-bell';

export default function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 md:px-6">
      <div className="flex items-center flex-1 max-w-md">
        <SearchGlobal />
      </div>

      <div className="flex items-center gap-2 ml-4">
        <NotificationBell />
        <ChangeLanguage />
        <UserMenu />
      </div>
    </header>
  );
}
