'use client';

import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export function ToggleTheme() {
  const { theme, setTheme } = useTheme();
  const { isSignedIn } = useAuth();
  const updateSettings = useMutation(api.users.updateUserSettings);
  const { dict } = useClientDictionary();

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    if (theme === newTheme) return;

    try {
      setTheme(newTheme);

      if (isSignedIn) updateSettings({ theme: newTheme });

      toast.success(dict?.settings?.notifications?.themeUpdated);
    } catch {
      toast.error(dict?.settings?.notifications?.themeUpdateFailed);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-(--accent-color)" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-(--accent-color)" />
          <span className="sr-only">{dict?.settings?.theme?.title}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleThemeChange('light')}
          className="cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          <span className="flex-1">{dict?.settings?.theme?.light}</span>
          {theme === 'light' && (
            <div className="h-2 w-2 rounded-full bg-(--accent-color)" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange('dark')}
          className="cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          <span className="flex-1">{dict?.settings?.theme?.dark}</span>
          {theme === 'dark' && (
            <div className="h-2 w-2 rounded-full bg-(--accent-color)" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange('system')}
          className="cursor-pointer"
        >
          <Monitor className="h-4 w-4" />
          <span className="flex-1">{dict?.settings?.theme?.system}</span>
          {theme === 'system' && (
            <div className="h-2 w-2 rounded-full bg-(--accent-color)" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
