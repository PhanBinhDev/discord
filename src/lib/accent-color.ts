/**
 * Utility functions for working with Discord-style accent colors
 */

import { type CSSProperties } from 'react';

/**
 * Get inline styles to apply accent color
 */
export function accentColorStyle(opacity = 1): CSSProperties {
  return {
    backgroundColor:
      opacity === 1
        ? 'var(--accent-color)'
        : `rgba(var(--accent-color-rgb), ${opacity})`,
  };
}

/**
 * Get inline styles for text with accent color
 */
export function accentTextStyle(opacity = 1): CSSProperties {
  return {
    color:
      opacity === 1
        ? 'var(--accent-color)'
        : `rgba(var(--accent-color-rgb), ${opacity})`,
  };
}

/**
 * Get inline styles for border with accent color
 */
export function accentBorderStyle(opacity = 1, width = 1): CSSProperties {
  const color =
    opacity === 1
      ? 'var(--accent-color)'
      : `rgba(var(--accent-color-rgb), ${opacity})`;
  return {
    borderColor: color,
    borderWidth: `${width}px`,
  };
}

/**
 * Tailwind classes that work with accent color CSS variables
 */
export const accentClasses = {
  bg: 'bg-[var(--accent-color)]',
  bgHover: 'hover:bg-[var(--accent-hover)]',
  bgActive: 'active:bg-[var(--accent-active)]',
  text: 'text-[var(--accent-color)]',
  border: 'border-[var(--accent-color)]',
  ring: 'ring-[var(--accent-color)]',
  outline: 'outline-[var(--accent-color)]',
} as const;

/**
 * Get hover handlers for accent color transitions
 */
export function getAccentHoverHandlers() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = 'var(--accent-color)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = '';
    },
  };
}

/**
 * Get hover handlers for accent text color transitions
 */
export function getAccentTextHoverHandlers() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = 'var(--accent-color)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.color = '';
    },
  };
}
