import { UserStatus } from '@/convex/schema';
import { StatusExpiredValue } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const USER_COLORS = [
  '#2563eb',
  '#DC2626',
  '#D97706',
  '#059669',
  '#7C3AED',
  '#DB2777',
  '#F59E42',
  '#10B981',
  '#6366F1',
  '#F43F5E',
];

export const getUserColor = (connectionId: number): string => {
  const index = (connectionId - 1) % USER_COLORS.length;
  return USER_COLORS[index];
};

export function getUserStatusStyle(status?: UserStatus) {
  switch (status) {
    case 'online':
      return 'text-green-500';
    case 'away':
      return 'text-yellow-500';
    case 'busy':
      return 'text-red-500';
    case 'offline':
    default:
      return 'text-gray-400';
  }
}

export function convertTimeTextToNumber(
  timeText: StatusExpiredValue,
): number | undefined {
  const now = Date.now();

  switch (timeText) {
    case '15_minutes':
      return now + 15 * 60 * 1000;
    case '1_hour':
      return now + 60 * 60 * 1000;
    case '8_hours':
      return now + 8 * 60 * 60 * 1000;
    case '24_hours':
      return now + 24 * 60 * 60 * 1000;
    case '3_days':
      return now + 3 * 24 * 60 * 60 * 1000;
    case 'never':
    default:
      return undefined;
  }
}
