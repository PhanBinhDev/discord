'use client';

import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { SignInButton } from '@clerk/nextjs';
import { Authenticated, Unauthenticated } from 'convex/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useReadLocalStorage } from 'usehooks-ts';
import { ChangeLanguage } from './change-language';
import TranslateText from './translate/translate-text';
import { UserMenu } from './user-menu';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const redirectUrl = useReadLocalStorage<string>(
    LOCAL_STORAGE_KEY.REDIRECT_URL,
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-50
        flex items-center justify-between
        px-4 py-2.5 md:px-6 md:py-3
        rounded-xl md:rounded-2xl
        max-w-7xl mx-auto
        transition-all duration-300
        ${
          scrolled
            ? 'bg-background/80 backdrop-blur-2xl border border-border shadow-lg shadow-black/5'
            : 'bg-background/60 backdrop-blur-xl border border-border/40 shadow-sm'
        }
      `}
    >
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-lg md:text-xl hover:opacity-80 transition-opacity"
      >
        <div className="relative">
          <Image
            src="/logo.png"
            alt="Facetime"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <div className="absolute -inset-1 bg-(--accent-color) rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity -z-10" />
        </div>
        <span className="hidden md:block text-foreground font-semibold">
          <TranslateText value="app.name" />
        </span>
      </Link>

      <nav className="flex items-center gap-1 md:gap-1.5">
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            asChild
            className="text-foreground hover:text-(--accent-color) hover:bg-(--accent-color)/10 rounded-xl"
          >
            <Link href="/home">
              <TranslateText value="nav.features" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="text-foreground hover:text-(--accent-color) hover:bg-(--accent-color)/10 rounded-xl"
          >
            <Link href="/home">
              <TranslateText value="nav.app" />
            </Link>
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <div className="flex items-center gap-2">
            <ChangeLanguage />

            <Unauthenticated>
              <SignInButton mode="modal" fallbackRedirectUrl={redirectUrl}>
                <Button variant="gradient" className="rounded-xl">
                  <TranslateText value="nav.getStarted" />
                </Button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <UserMenu />
            </Authenticated>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="flex md:hidden items-center gap-1.5">
          <ChangeLanguage mode="toggle" />
          <Unauthenticated>
            <SignInButton mode="modal" fallbackRedirectUrl={redirectUrl}>
              <Button size="sm" variant="gradient">
                <TranslateText value="nav.getStarted" />
              </Button>
            </SignInButton>
          </Unauthenticated>
          <Authenticated>
            <UserMenu />
          </Authenticated>
        </div>
      </nav>
    </header>
  );
}
