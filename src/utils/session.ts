import {
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDeviceTablet,
} from '@tabler/icons-react';

export const getDeviceIcon = (deviceType?: string, isMobile?: boolean) => {
  if (isMobile) return IconDeviceMobile;
  if (deviceType?.toLowerCase().includes('tablet')) return IconDeviceTablet;
  if (deviceType?.toLowerCase().includes('desktop')) return IconDeviceDesktop;
  return IconDeviceLaptop;
};

export const formatLocation = (city?: string, country?: string) => {
  const parts = [city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
};
