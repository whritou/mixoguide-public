import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
    id:      string
    message: string
    type:    ToastType
}

interface ToastStore {
    toasts:      ToastItem[]
    showToast:   (message: string, type?: ToastType) => void
    removeToast: (id: string) => void
}

let _nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    showToast: (message, type = 'info') => {
        const id = String(++_nextId)
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => {
            set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
        }, 3500)
    },
    removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Imperative helper — call from outside React (e.g. axios interceptors)
export function showToast(message: string, type: ToastType = 'info') {
    useToastStore.getState().showToast(message, type)
}
