import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import type { ApiError } from "../api/client";
import { pushToast } from "../stores/toast-store";
import i18n from "./i18n";

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error;
}

function toastError(error: unknown) {
  if (isApiError(error)) {
    pushToast({
      tone: "error",
      title: error.title ?? i18n.t("errors.generic"),
      description: error.detail,
    });
    return;
  }

  pushToast({ tone: "error", title: i18n.t("errors.generic") });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
  queryCache: new QueryCache({ onError: toastError }),
  mutationCache: new MutationCache({ onError: toastError }),
});
