import { cn } from '@/lib/utils';
import { IconLoader } from '@tabler/icons-react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

const Spinner = ({ size = 24, className }: SpinnerProps) => {
  return <IconLoader className={cn('animate-spin', className)} size={size} />;
};

export default Spinner;
