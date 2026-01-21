export function getCookieLocale() {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find(c => c.startsWith('locale='))
    ?.split('=')[1];
}