'use client';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Hint } from '@/components/ui/hint';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import { convexQuery } from '@convex-dev/react-query';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const Microphone = () => {
  const { dict } = useClientDictionary();

  const { data: userSettings, isLoading: isLoadingUserSettings } = useQuery(
    convexQuery(api.users.getUserSettings),
  );

  const { mutate: updateSettings, pending } = useApiMutation(
    api.users.updateUserSettings,
  );

  if (isLoadingUserSettings || !userSettings) {
    return <Skeleton className="size-8 rounded bg-muted-foreground/30" />;
  }

  const isMuted = userSettings.voice?.defaultMuted ?? false;

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(dict?.servers.settings.errors?.browserNotSupported);
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast.error(dict?.servers.settings.errors?.microphoneNotFound);
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      stream.getTracks().forEach(track => track.stop());
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        toast.error(dict?.servers.settings.errors?.permissionDenied);
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        toast.error(dict?.servers.settings.errors?.microphoneConnectRequired);
      } else {
        toast.error(
          `${dict?.servers.settings.errors?.microphoneAccessFailed}: ${error.message}`,
        );
      }
      return false;
    }
  };

  const handleToggle = async () => {
    if (isMuted) {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        return;
      }
    }

    updateSettings({
      voice: {
        defaultMuted: !isMuted,
        defaultDeafened: userSettings.voice?.defaultDeafened ?? false,
        inputVolume: userSettings.voice?.inputVolume,
        outputVolume: userSettings.voice?.outputVolume,
      },
    });
  };

  return (
    <Hint
      label={
        isMuted
          ? dict?.servers.settings.enabledMicrophone
          : dict?.servers.settings.disabledMicrophone
      }
      side="top"
      align="center"
      alignOffset={0}
    >
      <ButtonGroup>
        <Button
          size={'icon'}
          className={isMuted ? '' : 'hover:bg-muted-foreground/10'}
          onClick={handleToggle}
          disabled={pending}
          variant={isMuted ? 'destructive' : 'ghost'}
        >
          {isMuted ? (
            <IconMicrophoneOff className="size-5" />
          ) : (
            <IconMicrophone className="size-5" />
          )}
        </Button>
        <Button
          size={'icon'}
          className="px-0 w-4 hover:bg-muted-foreground/10"
          variant={'ghost'}
        >
          <ChevronUp className="size-4" />
        </Button>
      </ButtonGroup>
    </Hint>
  );
};

export default Microphone;
