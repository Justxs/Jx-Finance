import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-1.5 border-b bg-card px-8">
          <LanguageToggle />
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-10">
          <Outlet />
        </main>

        <footer className="mx-auto w-full max-w-5xl px-8 pb-8 text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Local-first, self-hosted.
        </footer>
      </div>
    </div>
  );
}
