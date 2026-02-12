import { ConversationType } from '@/convex/schema';
import { create } from 'zustand';

interface ToggerSideConversationStore {
  type: Record<ConversationType, boolean>;
  toggle: (action: ConversationType) => void;
}

export const useToggleSideConversation = create<ToggerSideConversationStore>(
  set => ({
    type: { direct: false, group: false, server: false },
    toggle: (action: ConversationType) =>
      set(state => ({
        type: { ...state.type, [action]: !state.type[action] },
      })),
  }),
);
