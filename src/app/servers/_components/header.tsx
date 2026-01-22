import { ChangeLanguage } from '@/components/shared/change-language';
import { ToggleTheme } from '@/components/shared/toggle-theme';
import { UserMenu } from '@/components/shared/user-menu';
import { NotificationBell } from './notification-bell';

export default function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between bg-background px-4 md:px-6">
      <div />
      <div className="flex items-center gap-2 ml-4">
        <NotificationBell size="medium" />
        <ChangeLanguage />
        <ToggleTheme />
        <UserMenu />
      </div>
    </header>
  );
}
