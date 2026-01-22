'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import { getInitials } from '@/utils';
import { useAuth } from '@clerk/nextjs';
import {
  IconClock,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import TranslateText from './translate/translate-text';
import { UserDateTime } from './use-date-time';

export function UserMenu() {
  const { signOut } = useAuth();
  const user = useQuery(api.users.currentUser);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.avatarUrl}
              alt={user.displayName || user.username}
            />
            <AvatarFallback className="bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-semibold">
              {getInitials(user.displayName || user.username || user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                />
                <AvatarFallback className="bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-sm">
                  {getInitials(user.displayName || user.username || user.email)}
                </AvatarFallback>
              </Avatar>
              {/* Status indicator */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                  user.status === 'online'
                    ? 'bg-green-500'
                    : user.status === 'away'
                      ? 'bg-yellow-500'
                      : user.status === 'busy'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex flex-col space-y-1 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-none truncate">
                  {user.displayName || user.username}
                </p>
                {user.customStatus && (
                  <span className="text-xs text-muted-foreground truncate">
                    - {user.customStatus}
                  </span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.username}#{user.discriminator}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  {user.username}#{user.discriminator}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Time */}
        <div className="p-2 bg-muted/50 mx-1 rounded-md">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconClock className="h-3.5 w-3.5" stroke={1.5} />
            <span>
              <UserDateTime live format="time" showSeconds />
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground/70 mt-1">
            <UserDateTime live format="date" />
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <IconLayoutDashboard className="h-4 w-4" stroke={1.5} />
            <TranslateText value="nav.dashboard" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer">
            <IconSettings className="h-4 w-4" stroke={1.5} />
            <TranslateText value="nav.settings" />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <IconLogout className="h-4 w-4 text-destructive" stroke={1.5} />
          <TranslateText value="auth.signOut" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
