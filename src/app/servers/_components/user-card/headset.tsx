'use client';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Hint } from '@/components/ui/hint';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { convexQuery } from '@convex-dev/react-query';
import { IconHeadset, IconHeadsetOff, IconSettings } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';

const Headset = () => {
  const { dict } = useClientDictionary();
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [volume, setVolume] = useState<number>(100);

  const { data: userSettings, isLoading: isLoadingUserSettings } = useQuery(
    convexQuery(api.users.getUserSettings),
  );

  const { mutate: updateSettings, pending } = useApiMutation(
    api.users.updateUserSettings,
  );

  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioOutputDevices(outputs);
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    loadAudioDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        loadAudioDevices,
      );
    };
  }, []);

  useEffect(() => {
    if (userSettings?.voice?.outputVolume !== undefined) {
      setVolume(userSettings.voice.outputVolume);
    }
  }, [userSettings]);

  const isDeafened = userSettings?.voice?.defaultDeafened ?? false;

  const checkAudioDevices = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error(dict?.servers.settings.errors?.audioDeviceNotSupported);
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = devices.filter(
        device => device.kind === 'audiooutput',
      );

      if (audioOutputDevices.length === 0) {
        toast.error(dict?.servers.settings.errors?.audioOutputNotFound);
        return false;
      }

      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(
        `${dict?.servers.settings.errors?.audioDeviceCheckFailed}: ${error.message}`,
      );
      return false;
    }
  };

  const handleToggle = async () => {
    if (isDeafened) {
      const hasDevices = await checkAudioDevices();
      if (!hasDevices) {
        return;
      }
    }

    if (!userSettings) return;

    updateSettings({
      voice: {
        defaultMuted: userSettings.voice?.defaultMuted ?? false,
        defaultDeafened: !isDeafened,
        inputVolume: userSettings.voice?.inputVolume,
        outputVolume: userSettings.voice?.outputVolume,
      },
    });
  };

  const debouncedVolumeUpdate = useDebounceCallback((newVolume: number) => {
    if (!userSettings) return;

    updateSettings({
      voice: {
        defaultMuted: userSettings.voice?.defaultMuted ?? false,
        defaultDeafened: userSettings.voice?.defaultDeafened ?? false,
        inputVolume: userSettings.voice?.inputVolume,
        outputVolume: newVolume,
      },
    });
  }, 500);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    debouncedVolumeUpdate(newVolume);
  };

  if (isLoadingUserSettings || !userSettings) {
    return <Skeleton className="size-8 rounded bg-muted-foreground/30" />;
  }

  return (
    <Hint
      label={
        isDeafened
          ? dict?.servers.settings.enabledSound
          : dict?.servers.settings.disabledSound
      }
      side="top"
      align="center"
      alignOffset={0}
    >
      <ButtonGroup>
        <Button
          size={'icon'}
          variant={isDeafened ? 'destructive' : 'ghost'}
          className={isDeafened ? '' : 'hover:bg-muted-foreground/10'}
          onClick={handleToggle}
          disabled={pending}
        >
          {isDeafened ? (
            <IconHeadsetOff className="size-5" />
          ) : (
            <IconHeadset className="size-5" />
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size={'icon'}
              className="px-0 w-4 hover:bg-muted-foreground/10"
              variant={'ghost'}
            >
              <ChevronUp className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-60 p-3 bg-muted border-muted-foreground/20 rounded-lg shadow-lg"
          >
            <div className="space-y-3">
              {/* Output Device */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-2 h-auto py-2 hover:bg-muted-foreground/10 rounded"
                    >
                      <div className="text-left">
                        <div className="text-xs font-semibold text-foreground/60 mb-0.5">
                          {dict?.servers.settings.outputDevice}
                        </div>
                        <div className="text-sm text-foreground">
                          {audioOutputDevices.find(
                            d => d.deviceId === selectedDeviceId,
                          )?.label ||
                            audioOutputDevices[0]?.label ||
                            'Default'}
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-foreground/60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-64 p-1 bg-muted border-muted-foreground/20 rounded-lg shadow-lg"
                  >
                    <div className="space-y-0.5">
                      {audioOutputDevices.length > 0 ? (
                        audioOutputDevices.map(device => (
                          <Button
                            key={device.deviceId}
                            variant="ghost"
                            className="w-full justify-start px-3 py-2 h-auto text-sm hover:bg-muted-foreground/10 rounded"
                            onClick={() => setSelectedDeviceId(device.deviceId)}
                          >
                            <div className="flex items-center gap-2">
                              {selectedDeviceId === device.deviceId && (
                                <div className="size-2 rounded-full bg-(--accent-color)" />
                              )}
                              <span className="truncate text-foreground">
                                {device.label}
                              </span>
                            </div>
                          </Button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-foreground/60">
                          {dict?.servers.settings.noOutputDevices}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Output Volume */}
              <div className="px-2 space-y-2">
                <div className="text-xs font-semibold text-foreground/60">
                  {dict?.servers.settings.outputVolume}
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Voice Settings */}
              <Button
                variant="ghost"
                className="w-full justify-between px-2 h-auto py-2 hover:bg-muted-foreground/10 rounded"
              >
                <span className="text-sm font-medium text-foreground">
                  {dict?.servers.settings.title}
                </span>
                <IconSettings className="size-4 text-foreground/60" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
    </Hint>
  );
};

export default Headset;
