'use client'
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  chatOpen: boolean
  activeModal: string | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleChat: () => void
  openChat: () => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  chatOpen: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openChat: () => set({ chatOpen: true }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
