export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const DISCORD_COLORS = {
  blurple: '#5865F2',
  green: '#57F287',
  yellow: '#FEE75C',
  fuchsia: '#EB459E',
  red: '#ED4245',
  white: '#FFFFFF',
  black: '#000000',

  highlighted: '#7289DA',
  developerBlue: '#5A70D9',
  balanceAqua: '#45DDC0',
  bugHunter: '#3BA55D',
  goldenBugHunterLight: '#FAA81A',
  goldenBugHunter: '#F0B232',
  hypesquadEventsOrange: '#F47B67',
  canaryOrange: '#F8A23F',
  idleOrange: '#FAA61A',
  nitroOrange: '#F47FFF',
  kreep: '#F47B67',
  brillianceRed: '#FD2D51',
  retroPink: '#F28BAA',
  nitroPinkLight: '#FFF0FF',
  breweryPurple: '#9B84EE',
  streamingPurple: '#593695',
} as const;

export const ACCENT_COLORS = [
  'blurple',
  'green',
  'yellow',
  'fuchsia',
  'red',
  'aqua',
  'orange',
  'purple',
] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const ACCENT_COLOR_VALUES: Record<AccentColor, string> = {
  blurple: DISCORD_COLORS.blurple,
  green: DISCORD_COLORS.green,
  yellow: DISCORD_COLORS.yellow,
  fuchsia: DISCORD_COLORS.fuchsia,
  red: DISCORD_COLORS.red,
  aqua: DISCORD_COLORS.balanceAqua,
  orange: DISCORD_COLORS.hypesquadEventsOrange,
  purple: DISCORD_COLORS.breweryPurple,
};

export function applyAccentColor(color: AccentColor) {
  const colorValue = ACCENT_COLOR_VALUES[color];
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--accent-color', colorValue);
    document.documentElement.style.setProperty(
      '--accent-color-rgb',
      hexToRgb(colorValue),
    );
  }
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '88, 101, 242';
}
