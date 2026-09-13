import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  currentView: 'dashboard' | 'connections' | 'messages' | 'groups' | 'calls';
  selectedConnectionId: string | null;
  selectedGroupId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedConnectionId: (id: string | null) => void;
  setSelectedGroupId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentView: 'dashboard',
  selectedConnectionId: null,
  selectedGroupId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
}));
