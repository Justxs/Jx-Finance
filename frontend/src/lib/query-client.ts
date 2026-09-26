import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type ApiError, isApiError } from "@/api/client";
import { invalidateAfterMutation } from "@/api/invalidation";
import { errorCodeText, serverErrorText } from "@/lib/form-server-errors";
import { i18n } from "@/lib/i18n";

const ERROR_TOAST_DURATION = 12_000;

export function errorMessage(error: unknown) {
  if (!isApiError(error)) {
    return { title: i18n.t("errors.generic"), description: undefined };
  }

  if (error.status === 429 && !error.code && !error.errors?.length) {
    return { title: i18n.t("errors.tooManyRequests"), description: undefined };
  }

  return {
    title: error.title || i18n.t("errors.generic"),
    description: error.errors?.length
      ? error.errors.map(serverErrorText).join(" ")
      : (errorCodeText(error.code, error.detail) ?? error.detail),
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
    mutationMeta: { silent?: boolean; success?: string };
  }
}

export function createMutationCache() {
  return new MutationCache({
    onSuccess: (_data, _variables, _result, mutation) => {
      if (mutation.meta?.success) {
        toast.success(mutation.meta.success);
      }
    },
    onError: (error, _variables, _result, mutation) => {
      if (mutation.meta?.silent !== true) {
        toastError(error);
      }
    },
    onSettled: (_data, _error, _variables, _result, _mutation, context) => {
      void invalidateAfterMutation(context.client, context.mutationKey);
    },
  });
}

interface QueryWithData {
  state: { data: unknown };
}

function hasNothingToShow(query: QueryWithData) {
  return query.state.data === undefined;
}

export function throwWithoutData(_error: unknown, query: QueryWithData) {
  return hasNothingToShow(query);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      throwOnError: throwWithoutData,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent !== true && !hasNothingToShow(query)) {
        toastError(error);
      }
    },
  }),
  mutationCache: createMutationCache(),
});
