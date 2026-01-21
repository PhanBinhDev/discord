import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export function useUserDateTime() {
  const settings = useQuery(api.users.getUserSettings);
  const locale = settings?.language || 'en';

  const formatDate = useMemo(() => {
    return (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;

      return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };
  }, [locale]);

  const formatTime = useMemo(() => {
    return (date: Date | string, showSeconds = false) => {
      const d = typeof date === 'string' ? new Date(date) : date;

      return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        ...(showSeconds && { second: '2-digit' }),
        hour12: false,
      });
    };
  }, [locale]);

  const formatDateTime = useMemo(() => {
    return (date: Date | string) => {
      return `${formatDate(date)} ${formatTime(date)}`;
    };
  }, [formatDate, formatTime]);

  const getCurrentTime = useMemo(() => {
    return () => new Date();
  }, []);

  return {
    formatDate,
    formatTime,
    formatDateTime,
    getCurrentTime,
    settings,
  };
}
