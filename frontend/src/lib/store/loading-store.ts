import { create } from 'zustand'

interface LoadingState {
  pending: number
  start: () => void
  stop: () => void
  reset: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  pending: 0,
  start: () => set((state) => ({ pending: state.pending + 1 })),
  stop: () => set((state) => ({ pending: Math.max(0, state.pending - 1) })),
  reset: () => set({ pending: 0 }),
}))

export function startGlobalLoading() {
  useLoadingStore.getState().start()
}

export function stopGlobalLoading() {
  useLoadingStore.getState().stop()
}
