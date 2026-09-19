import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";
import { i18n } from "@/lib/i18n";

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error;
}

const ERROR_TOAST_DURATION = 12_000;

export function errorMessage(error: unknown) {
  if (!isApiError(error)) {
    return { title: i18n.t("errors.generic"), description: undefined };
  }

  return {
    title: error.title ?? i18n.t("errors.generic"),
    description: error.detail ?? error.errors?.map((detail) => detail.reason).join(" "),
  };
}

function toastError(error: unknown) {
  const { title, description } = errorMessage(error);
  toast.error(title, { description, duration: ERROR_TOAST_DURATION });
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { silent?: boolean };
    mutationMeta: { silent?: boolean };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      throwOnError: true,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent !== true) {
        toastError(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silent !== true) {
        toastError(error);
      }
    },
  }),
});
