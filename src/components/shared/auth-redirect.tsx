'use client';

import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const AuthRedirect = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [redirectUrl, setRedirectUrl] = useLocalStorage<string>(
    LOCAL_STORAGE_KEY.REDIRECT_URL,
    '/dashboard',
  );
  const searchParams = useSearchParams();
  const [requiredAuth, showRequiredAuth] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (searchParams.get('sign-in') === 'true') {
      showRequiredAuth(true);
      const url = searchParams.get('redirect') || '/dashboard';
      setRedirectUrl(url);

      const params = new URLSearchParams(searchParams);
      params.delete('sign-in');
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, setRedirectUrl]);

  useEffect(() => {
    if (isLoaded && !isSignedIn && requiredAuth && !hasTriggered.current) {
      hasTriggered.current = true;
      setTimeout(() => {
        buttonRef.current?.click();
      }, 100);
    }
  }, [isLoaded, isSignedIn, requiredAuth]);

  return (
    <>
      {requiredAuth && (
        <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
          <button
            ref={buttonRef}
            className="fixed opacity-0 pointer-events-none -z-10"
            aria-hidden="true"
          >
            Sign In
          </button>
        </SignInButton>
      )}
    </>
  );
};

export default AuthRedirect;
