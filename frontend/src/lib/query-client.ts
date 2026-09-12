import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";
import i18n from "@/lib/i18n";

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error;
}

function toastError(error: unknown) {
  if (isApiError(error)) {
    toast.error(error.title ?? i18n.t("errors.generic"), {
      description: error.detail ?? error.errors?.map((detail) => detail.reason).join(" "),
    });
    return;
  }

  toast.error(i18n.t("errors.generic"));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      throwOnError: true,
    },
  },
  queryCache: new QueryCache({ onError: toastError }),
  mutationCache: new MutationCache({ onError: toastError }),
});
