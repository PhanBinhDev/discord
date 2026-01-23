import { DEFAULT_PANNEL_LEFT_MIN_WIDTH } from '@/constants/app';
import { create } from 'zustand';

interface SidebarWidthStore {
  width: number;
  setWidth: (width: number) => void;
}

export const useSidebarWidth = create<SidebarWidthStore>(set => ({
  width: DEFAULT_PANNEL_LEFT_MIN_WIDTH,
  setWidth: (width: number) => set({ width }),
}));
