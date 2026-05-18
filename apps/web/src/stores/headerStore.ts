import { create } from 'zustand'

interface HeaderState {
    show: boolean
    fixed: boolean
    sticky: boolean
    inDashboard: boolean
    setShow: (show: boolean) => void
    setFixed: (fixed: boolean) => void
    setSticky: (sticky: boolean) => void
    setInDashboard: (inDashboard: boolean) => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
    show: true,
    fixed: false,
    sticky: true,
    inDashboard: false,
    setShow: (show) => set({ show }),
    setFixed: (fixed) => set({ fixed }),
    setSticky: (sticky) => set({ sticky }),
    setInDashboard: (inDashboard) => set({ inDashboard }),
}))
