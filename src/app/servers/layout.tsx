'use client';

import { NavigationSidebar } from '@/components/navigation/navigation-sidebar';
import { usePresence } from '@/hooks/use-presence';
import TopHeader from './_components/top-header';

const DashboardLayout = ({ children }: IChildren) => {
  usePresence();

  return (
    <div className="h-screen">
      <TopHeader />
      <main className="h-full flex">
        <NavigationSidebar />
        <div className="flex-1 overflow-hidden p-3 pt-0 pl-0">
          <div className="rounded-lg flex border border-border h-full bg-muted/20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
