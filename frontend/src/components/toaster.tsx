import { useTranslation } from "react-i18next";
import { dismissToast, useToasts, type ToastTone } from "../stores/toast-store";

const toneStyles: Record<ToastTone, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-line bg-white text-ink",
};

export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToasts();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto rounded-2xl border p-4 shadow-soft ${toneStyles[toast.tone]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="text-sm opacity-80">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-sm opacity-60 transition hover:opacity-100"
              aria-label={t("toast.dismiss")}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
