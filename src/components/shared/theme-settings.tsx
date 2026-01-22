'use client';

import { api } from '@/../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  ACCENT_COLORS,
  ACCENT_COLOR_VALUES,
  THEMES,
  type AccentColor,
  type Theme,
} from '@/constants/theme';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { Check, Crown, Lock, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeSettings() {
  const { dict } = useClientDictionary();
  const { theme: currentTheme, setTheme } = useTheme();
  const { data: settings } = useQuery(
    convexQuery(api.users.getUserSettings, {}),
  );
  const updateSettings = useMutation(api.users.updateUserSettings);
  const { user } = useUser();

  // Check if user has subscription via Clerk public metadata
  const hasSubscription =
    user?.publicMetadata?.subscription === 'premium' ||
    user?.publicMetadata?.subscription === 'pro';

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      await updateSettings({ theme: newTheme });
      toast.success(dict?.settings?.notifications?.themeUpdated);
    } catch {
      toast.error(dict?.settings?.notifications?.themeUpdateFailed);
    }
  };

  const handleAccentColorChange = async (color: AccentColor) => {
    if (!hasSubscription) {
      toast.error(dict?.settings?.notifications?.subscriptionRequired);
      return;
    }

    try {
      await updateSettings({ accentColor: color });
      toast.success(dict?.settings?.notifications?.accentColorUpdated);
    } catch {
      toast.error(dict?.settings?.notifications?.accentColorUpdateFailed);
    }
  };

  const selectedAccentColor = settings?.accentColor || 'blue';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict?.settings?.theme?.title || 'Theme'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(theme => {
              const Icon = THEME_ICONS[theme];
              const isSelected = currentTheme === theme;

              return (
                <Button
                  key={theme}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'flex h-24 flex-col items-center justify-center gap-2 relative',
                    isSelected && 'ring-2 ring-offset-2',
                  )}
                  onClick={() => handleThemeChange(theme)}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium capitalize">
                    {dict?.settings?.theme?.[theme] || theme}
                  </span>
                  {isSelected && (
                    <Check className="absolute right-2 top-2 h-4 w-4" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            {dict?.settings?.accentColor?.title || 'Accent Color'}
            {!hasSubscription && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!hasSubscription && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {dict?.settings?.accentColor?.upgradeTitle ||
                        'Upgrade to Premium'}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {dict?.settings?.accentColor?.upgradeDescription ||
                        'Unlock custom accent colors and more features with a premium subscription.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
              {ACCENT_COLORS.map(color => {
                const isSelected = selectedAccentColor === color;
                const isDisabled = !hasSubscription;

                return (
                  <button
                    key={color}
                    type="button"
                    disabled={isDisabled}
                    className={cn(
                      'group relative flex h-16 items-center justify-center rounded-lg transition-all',
                      'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
                      isSelected && 'ring-2 ring-offset-2',
                      isDisabled && 'cursor-not-allowed opacity-50',
                    )}
                    style={{
                      backgroundColor: ACCENT_COLOR_VALUES[color],
                    }}
                    onClick={() => handleAccentColorChange(color)}
                  >
                    {isSelected && (
                      <Check className="h-6 w-6 text-white drop-shadow-lg" />
                    )}
                    {isDisabled && !isSelected && (
                      <Lock className="h-5 w-5 text-white/70 drop-shadow" />
                    )}
                    <span className="sr-only">
                      {dict?.settings?.accentColor?.[color] || color}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">
                  {dict?.settings?.accentColor?.selected || 'Selected Color'}
                </Label>
                <p className="text-xs text-muted-foreground capitalize">
                  {dict?.settings?.accentColor?.[
                    selectedAccentColor as AccentColor
                  ] || selectedAccentColor}
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-full"
                style={{
                  backgroundColor:
                    ACCENT_COLOR_VALUES[selectedAccentColor as AccentColor],
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
