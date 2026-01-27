'use client';

import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { IconUser } from '@tabler/icons-react';
import { Dot } from 'lucide-react';
import Link from 'next/link';

const DashboardPage = () => {
  return (
    <div className="flex flex-col bg-muted/80 h-full">
      <div className="p-2 px-4 border-border border-b flex items-center">
        <div className="flex items-center gap-1.5">
          <IconUser size={16} />
          <span className="font-medium text-sm">
            <TranslateText value="servers.directMessage.friends" />
          </span>
        </div>

        <Dot size={35} />

        <Link href="/">
          <Button
            variant="ghost"
            className="pr-2 pl-3 text-sm justify-center bg-(--accent-color)/80 hover:bg-(--accent-color) truncate"
          >
            <TranslateText value="servers.directMessage.addFriend" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
