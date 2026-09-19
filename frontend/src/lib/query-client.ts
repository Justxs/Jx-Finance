import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type ApiError, isApiError } from "@/api/client";
import { invalidateAfterMutation } from "@/api/invalidation";
import { i18n } from "@/lib/i18n";

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
    defaultError: ApiError;
    queryMeta: { silent?: boolean };
    mutationMeta: { silent?: boolean };
  }
}

export function createMutationCache(onError?: (error: unknown, silent: boolean) => void) {
  return new MutationCache({
    onError: (error, _variables, _result, mutation) => {
      onError?.(error, mutation.meta?.silent === true);
    },
    onSettled: (_data, _error, _variables, _result, _mutation, context) => {
      void invalidateAfterMutation(context.client, context.mutationKey);
    },
  });
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
  mutationCache: createMutationCache((error, silent) => {
    if (!silent) {
      toastError(error);
    }
  }),
});
