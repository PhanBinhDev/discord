'use client';

import Prism from '@/components/prism';
import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEY } from '@/constants/key';
import { SignInButton } from '@clerk/nextjs';
import { IconArrowRight, IconSparkles } from '@tabler/icons-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMediaQuery, useReadLocalStorage } from 'usehooks-ts';

export default function LandingPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const redirectUrl = useReadLocalStorage<string>(
    LOCAL_STORAGE_KEY.REDIRECT_URL,
  );

  return (
    <div className="w-full h-screen flex items-center justify-center relative overflow-hidden">
      <Prism
        animationType="rotate"
        timeScale={0.5}
        height={8}
        baseWidth={isMobile ? 2.5 : 6}
        scale={2}
        hueShift={0.4}
        colorFrequency={1.5}
        noise={0}
        glow={1}
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8"
          >
            <IconSparkles className="w-4 h-4" />
            <span>
              <TranslateText value="hero.badge" />
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-white drop-shadow-2xl"
          >
            <TranslateText value="hero.title" />{' '}
            <span className="bg-linear-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent animate-pulse">
              <TranslateText value="app.name" />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl lg:text-3xl text-white/90 mb-10 drop-shadow-lg max-w-3xl mx-auto font-light"
          >
            <TranslateText value="hero.subtitle" />
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Unauthenticated>
              <SignInButton mode="modal" fallbackRedirectUrl={redirectUrl}>
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-(--accent-color) rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse" />

                  <Button
                    size="lg"
                    className="relative bg-(--accent-color) hover:bg-(--accent-hover) text-white font-semibold shadow-2xl transition-all rounded-xl px-8"
                  >
                    <TranslateText value="hero.cta.getStarted" />
                    <IconArrowRight
                      className="ml-2 group-hover:translate-x-1 transition-transform"
                      stroke={2}
                    />
                  </Button>
                </div>
              </SignInButton>
            </Unauthenticated>

            <Authenticated>
              <Link href="/">
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-(--accent-color) rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse" />

                  <Button
                    size="lg"
                    className="relative bg-(--accent-color) hover:bg-(--accent-hover) text-white font-semibold shadow-2xl transition-all rounded-xl px-8"
                  >
                    <TranslateText value="hero.cta.goToDashboard" />
                    <IconArrowRight
                      className="ml-2 group-hover:translate-x-1 transition-transform"
                      stroke={2}
                    />
                  </Button>
                </div>
              </Link>
            </Authenticated>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
}
