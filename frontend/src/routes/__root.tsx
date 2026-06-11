import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { t } = useTranslation();

  return (
    <div className="page-shell">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 pb-10">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold uppercase tracking-[0.28em] text-foreground">
            {t("appName")}
          </span>
          <span className="hidden text-sm text-muted-foreground md:inline">{t("tagline")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl">
        <Outlet />
      </main>

      <footer className="mx-auto mt-12 w-full max-w-6xl text-xs uppercase tracking-[0.28em] text-muted-foreground">
        Local-first, self-hosted.
      </footer>
    </div>
  );
}
