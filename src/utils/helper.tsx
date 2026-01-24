import { UserStatus } from '@/convex/schema';
import { IconPoint, IconPointFilled } from '@tabler/icons-react';

export function getIconUserStatus(status?: UserStatus) {
  switch (status) {
    case 'online':
    case 'busy':
    case 'away':
      return IconPointFilled;
    case 'offline':
    default:
      return IconPoint;
  }
}
