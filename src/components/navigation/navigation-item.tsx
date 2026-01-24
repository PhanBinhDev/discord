'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';

interface NavigationItemProps {
  id: string;
  imageUrl: string;
  name: string;
  imageClassname?: string;
}

export function NavigationItem({
  id,
  imageUrl,
  name,
  imageClassname,
}: NavigationItemProps) {
  const params = useParams();
  const router = useRouter();

  const onClick = () => {
    router.push(`/servers/${id}`);
  };

  return (
    <Hint side="right" align="center" label={name} sideOffset={-8}>
      <div className="flex items-center justify-center">
        <button onClick={onClick} className="group relative flex items-center">
          <div
            className={cn(
              'absolute left-0 bg-primary rounded-full transition-all w-1',
              params?.serverId !== id && 'group-hover:h-5',
              params?.serverId === id ? 'h-9' : 'h-2',
            )}
          />
          <div
            className={cn(
              'relative group flex mx-3 size-10 md:size-11 rounded-lg transition-all overflow-hidden cursor-pointer',
            )}
          >
            <Image
              fill
              src={imageUrl}
              alt="Channel"
              className={cn('object-cover', imageClassname)}
            />
          </div>
        </button>
      </div>
    </Hint>
  );
}
