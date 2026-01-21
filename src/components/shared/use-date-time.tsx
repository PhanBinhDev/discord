'use client';

import { useUserDateTime } from '@/hooks/use-user-date-time';
import { useEffect, useState } from 'react';

interface UserDateTimeProps {
  date?: Date | string;
  format?: 'date' | 'time' | 'datetime';
  live?: boolean;
  showSeconds?: boolean;
  className?: string;
}

export function UserDateTime({
  date,
  format = 'datetime',
  live = false,
  showSeconds = false,
  className,
}: UserDateTimeProps) {
  const { formatDate, formatTime, formatDateTime, getCurrentTime } =
    useUserDateTime();
  const [currentTime, setCurrentTime] = useState<Date>();

  useEffect(() => {
    if (!live) return;

    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    // Set initial time
    setCurrentTime(getCurrentTime());

    return () => clearInterval(interval);
  }, [live, getCurrentTime]);

  const displayDate = live ? currentTime : date;

  if (!displayDate) return null;

  let formattedValue = '';

  switch (format) {
    case 'date':
      formattedValue = formatDate(displayDate);
      break;
    case 'time':
      formattedValue = formatTime(displayDate, showSeconds);
      break;
    case 'datetime':
      formattedValue = formatDateTime(displayDate);
      break;
  }

  return <span className={className}>{formattedValue}</span>;
}
