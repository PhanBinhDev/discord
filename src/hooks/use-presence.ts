'use client';

import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef } from 'react';

export function usePresence() {
  const heartbeat = useMutation(api.users.heartbeat);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    const sendHeartbeat = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      if (timeSinceActivity < 2 * 60 * 1000) {
        heartbeat();
      }
    };

    sendHeartbeat();

    // Setup interval
    intervalRef.current = setInterval(sendHeartbeat, 30 * 1000);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [heartbeat]);
}

/**
 * Manual status update
 */
export function useUpdatePresence() {
  const data = useQuery(api.users.currentUser);

  const updatePresence = useMutation(api.users.updatePresence);

  return {
    setOnline: () =>
      updatePresence({ status: 'online', statusMessage: undefined }),
    setAway: (message?: string) =>
      updatePresence({
        status: 'away',
        statusMessage: message || 'Away',
      }),
    setBusy: (message?: string) => {
      updatePresence({
        status: 'busy',
        statusMessage: message || 'Busy',
      });
    },
    setOffline: (message?: string) =>
      updatePresence({
        status: 'offline',
        statusMessage: message || 'Offline',
      }),
    status: data?.status || 'offline',
  };
}
