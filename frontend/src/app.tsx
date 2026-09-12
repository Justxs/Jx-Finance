import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { setAuthenticated } from "@/lib/auth-gate";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { I18nextProvider } from "react-i18next";
import { routeTree } from "./route-tree.gen";
import { queryClient } from "@/lib/query-client";
import i18n from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { RoutePending } from "@/components/route-pending";
import { RouteError } from "@/components/route-error";

const router = createRouter({
  routeTree,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultPendingMs: 200,
  defaultPendingMinMs: 400,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  useEffect(() => {
    function expired() {
      setAuthenticated(false);
      queryClient.clear();
      void router.navigate({ to: "/login" });
    }
    window.addEventListener("jx:session-expired", expired);
    return () => window.removeEventListener("jx:session-expired", expired);
  }, []);
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
        {import.meta.env.DEV ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        ) : null}
        {import.meta.env.DEV ? (
          <TanStackRouterDevtools router={router} position="bottom-right" />
        ) : null}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
