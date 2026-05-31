import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "../components/language-toggle";

export const RootLayout = () => {
  const { t } = useTranslation();

  return (
    <div className="page-shell">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 pb-10">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold uppercase tracking-[0.28em] text-ink">
            {t("appName")}
          </span>
          <span className="hidden text-sm text-ink/60 md:inline">{t("tagline")}</span>
        </div>
        <LanguageToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl">
        <Outlet />
      </main>

      <footer className="mx-auto mt-12 w-full max-w-6xl text-xs uppercase tracking-[0.28em] text-ink/50">
        Local-first, self-hosted.
      </footer>
    </div>
  );
};
