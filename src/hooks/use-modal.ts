import { ModalType } from '@/types';
import { create } from 'zustand';

interface ModalData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Modal {
  type: ModalType;
  data?: ModalData;
}

interface ModalState {
  modals: Modal[];
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: (type: ModalType) => void;
  closeAllModals: () => void;
  isModalOpen: (type: ModalType) => boolean;
  getModalData: (type: ModalType) => ModalData | undefined;
  getModalIndex: (type: ModalType) => number;
}

const useModal = create<ModalState>((set, get) => ({
  modals: [],

  openModal: (type, data = {}) =>
    set(state => ({
      modals: [...state.modals, { type, data }],
    })),

  closeModal: type =>
    set(state => ({
      modals: state.modals.filter(modal => modal.type !== type),
    })),

  closeAllModals: () => set({ modals: [] }),

  isModalOpen: type => get().modals.some(modal => modal.type === type),

  getModalData: type => get().modals.find(modal => modal.type === type)?.data,

  getModalIndex: type => get().modals.findIndex(modal => modal.type === type),
}));

export default useModal;
