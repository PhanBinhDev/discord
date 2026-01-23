'use client';

import { NavigationSidebar } from '@/components/navigation/navigation-sidebar';
import { usePresence } from '@/hooks/use-presence';
import TopHeader from './_components/top-header';
import UserCard from './_components/user-card';

const DashboardLayout = ({ children }: IChildren) => {
  usePresence();

  return (
    <div className="h-screen">
      <TopHeader />
      <main className="h-full flex ralative">
        <NavigationSidebar />
        <div className="flex-1 overflow-hidden">
          <div className="rounded-tl-lg flex border border-border h-full bg-muted/20">
            {children}
          </div>
        </div>

        <UserCard />
      </main>
    </div>
  );
};

export default DashboardLayout;
