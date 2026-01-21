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
