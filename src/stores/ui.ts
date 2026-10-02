import { create } from 'zustand'
export type Page = 'dashboard' | 'editor' | 'receipts' | 'templates' | 'business' | 'settings'
interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info' }
interface UIState { page: Page; activeReceiptId: string | null; mobileMenu: boolean; toast: Toast | null; setPage: (page: Page) => void; openReceipt: (id: string) => void; setMobileMenu: (value: boolean) => void; notify: (message: string, tone?: Toast['tone']) => void; clearToast: () => void }
export const useUI = create<UIState>(set => ({
  page: 'dashboard', activeReceiptId: null, mobileMenu: false, toast: null,
  setPage: page => set({ page, mobileMenu: false }),
  openReceipt: activeReceiptId => set({ page: 'editor', activeReceiptId, mobileMenu: false }),
  setMobileMenu: mobileMenu => set({ mobileMenu }),
  notify: (message, tone = 'success') => {
    const id = Date.now()
    set({ toast: { id, message, tone } })
    window.setTimeout(() => set(state => state.toast?.id === id ? { toast: null } : state), 3500)
  },
  clearToast: () => set({ toast: null })
}))
