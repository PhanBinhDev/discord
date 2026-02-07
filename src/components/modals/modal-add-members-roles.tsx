import TranslateText from '@/components/shared/translate/translate-text';
import UserAvatar from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_ROLE_COLOR } from '@/constants/app';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useClientDictionary } from '@/hooks/use-client-dictionary';
import useModal from '@/hooks/use-modal';
import { cn } from '@/lib/utils';
import { convexQuery } from '@convex-dev/react-query';
import { IconShieldCheckFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'radix-ui';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

const ModalAddMemberRoles = () => {
  const { isModalOpen, closeModal, getModalData } = useModal();
  const { dict } = useClientDictionary();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [selectedRoles, setSelectedRoles] = useState<Set<Id<'roles'>>>(
    new Set(),
  );
  const [selectedUsers, setSelectedUsers] = useState<Set<Id<'users'>>>(
    new Set(),
  );

  const { category } = getModalData('ModalAddMemberRoles') as {
    category: Doc<'channelCategories'>;
  };

  const { data: searchResults } = useQuery({
    ...convexQuery(api.servers.searchUsersAndRoles, {
      serverId: category.serverId,
      query: debouncedSearch,
    }),
    enabled: isModalOpen('ModalAddMemberRoles'),
  });

  const toggleRole = (roleId: Id<'roles'>) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const toggleUser = (userId: Id<'users'>) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  return (
    <Dialog
      onOpenChange={() => closeModal('ModalAddMemberRoles')}
      open={isModalOpen('ModalAddMemberRoles')}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-left">
            <TranslateText value="servers.category.edit.permissions.membersAndRoles.title" />
          </DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription className="text-left">
              <TranslateText value="servers.category.edit.permissions.membersAndRoles.description" />
            </DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder={dict?.servers.category.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />

          <ScrollArea className="max-h-[400px] min-h-[200px] -mx-6 px-6">
            <div className="flex flex-col gap-3">
              {/* Roles Section */}
              {searchResults?.roles && searchResults.roles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    <TranslateText value="servers.category.roles" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {searchResults.roles.map(role => (
                      <div
                        key={role._id}
                        className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => toggleRole(role._id)}
                      >
                        <Checkbox
                          checked={selectedRoles.has(role._id)}
                          onCheckedChange={() => toggleRole(role._id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <IconShieldCheckFilled
                            className={cn(
                              'size-4 shrink-0',
                              role.color
                                ? `text-[${role.color}]`
                                : `text-[${DEFAULT_ROLE_COLOR}]`,
                            )}
                          />
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: role.color || undefined }}
                          >
                            {role.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <TranslateText value="servers.category.roles" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Section */}
              {searchResults?.users && searchResults.users.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    <TranslateText value="servers.category.members" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {searchResults.users.map(user => (
                      <div
                        key={user._id}
                        className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => toggleUser(user._id!)}
                      >
                        <Checkbox
                          checked={selectedUsers.has(user._id!)}
                          onCheckedChange={() => toggleUser(user._id!)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <UserAvatar
                            src={user.avatarUrl}
                            size={7}
                            name={user.displayName || user.username}
                            showTooltip={false}
                          />
                          <span className="text-sm font-medium truncate">
                            {user.displayName || user.username}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!searchResults?.roles || searchResults.roles.length === 0) &&
                (!searchResults?.users || searchResults.users.length === 0) && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <TranslateText value="common.noResultsFound" />
                  </div>
                )}
            </div>
          </ScrollArea>
        </div>
        <div className="justify-end flex items-center gap-2 mt-3">
          <Button
            className="bg-muted-foreground/5 hover:bg-accent-foreground/5"
            variant={'ghost'}
            onClick={() => closeModal('ModalAddMemberRoles')}
          >
            <TranslateText value="common.cancel" />
          </Button>
          <Button>
            <TranslateText value={'common.save'} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalAddMemberRoles;
