'use client';

import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export function ClearRedirectAfterLogin() {
  const { isSignedIn } = useAuth();
  const [redirectUrl, setRedirectUrl] = useLocalStorage<string | null>(
    LOCAL_STORAGE_KEY.REDIRECT_URL,
    null,
  );

  useEffect(() => {
    if (isSignedIn && redirectUrl) {
      setRedirectUrl(null);
    }
  }, [isSignedIn, redirectUrl, setRedirectUrl]);

  return null;
}
