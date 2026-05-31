import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";

export type ToastTone = "error" | "success" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
}

const TOAST_DURATION_MS = 6000;

const toastStore = new Store<ToastState>({ toasts: [] });

let nextId = 0;

export function dismissToast(id: number) {
  toastStore.setState((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  }));
}

export function pushToast(toast: Omit<Toast, "id">) {
  nextId += 1;
  const id = nextId;
  toastStore.setState((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
  return id;
}

export function useToasts() {
  return useStore(toastStore, (state) => state.toasts);
}
