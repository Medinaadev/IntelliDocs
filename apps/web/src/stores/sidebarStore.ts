import { create } from 'zustand'

type SidebarStore = {
    isOpen: boolean
    open: () => void
    close: () => void
    toggle: () => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))
