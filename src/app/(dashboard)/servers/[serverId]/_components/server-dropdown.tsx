import TranslateText from '@/components/shared/translate/translate-text';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ServerMenusItems } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import useModal from '@/hooks/use-modal';
import { DictKey } from '@/internationalization/get-dictionaries';
import { cn } from '@/lib/utils';
import { ApiReturn, ServerMenuGroup } from '@/types';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

interface ServerDropdownProps {
  server: ApiReturn<typeof api.servers.getServerById> | null | undefined;
}

const ServerDropdown = ({ server }: ServerDropdownProps) => {
  const [open, setOpen] = useState(false);

  const { openModal } = useModal();

  const { data: user } = useQuery(convexQuery(api.users.currentUser));

  const isOwner = useMemo(() => user?._id === server?.ownerId, [user, server]);

  const groupedMenus = useMemo(() => {
    const temp = ServerMenusItems.reduce<
      Record<ServerMenuGroup, typeof ServerMenusItems>
    >(
      function (acc, item) {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      },
      {} as Record<ServerMenuGroup, typeof ServerMenusItems>,
    );

    return temp;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="pr-2 pl-3 text-sm justify-center hover:bg-muted truncate"
        >
          <span className="truncate">{server?.name}</span>
          <ChevronDown
            className={cn(
              'size-4 ml-auto transition-transform',
              open ? 'rotate-180' : '',
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 min-w-24">
        {Object.entries(groupedMenus)
          .map(([group, menus]) => {
            const visibleMenus = menus.filter(menu => {
              if (menu.owner && !isOwner) return false;
              if (group === 'danger' && isOwner) return false;
              return true;
            });

            if (visibleMenus.length === 0) return null;

            return { group, menus: visibleMenus };
          })
          .filter(Boolean)
          .map((item, idx, arr) => (
            <Fragment key={item?.group}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase select-none">
                <TranslateText
                  value={`servers.menu.${item?.group}` as DictKey}
                />
              </div>

              {/* Menu items */}
              {item?.menus.map(menu => {
                const Icon = menu.icon;
                const isDanger = item?.group === 'danger';

                return (
                  <Button
                    key={menu.label}
                    variant={'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isDanger
                        ? 'text-destructive hover:text-destructive focus:text-destructive'
                        : '',
                    )}
                    onClick={() => {
                      if (menu.modal)
                        openModal(menu.modal, {
                          server,
                        });
                    }}
                  >
                    <Icon className={cn(isDanger ? 'text-destructive' : '')} />
                    <TranslateText value={menu.label} />
                  </Button>
                );
              })}

              {idx < arr.length - 1 && <div className="my-1 h-px bg-border" />}
            </Fragment>
          ))}
      </PopoverContent>
    </Popover>
  );
};

export default ServerDropdown;
