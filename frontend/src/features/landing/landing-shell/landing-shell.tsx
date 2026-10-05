import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mail } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Brand, BrandMark } from "@/components/brand/brand";
import { LanguageToggle } from "@/components/language-toggle/language-toggle";
import { KofiCup, SUPPORT_URL } from "@/components/support-link/support-link";
import { ThemeToggle } from "@/components/theme-toggle/theme-toggle";
import { TornEdge } from "@/components/torn-edge/torn-edge";
import { buttonVariants } from "@/components/ui/button/button";
import { usePublicSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const SOURCE_URL = "https://github.com/Justxs/Jx-Finance";
export const SETUP_URL = `${SOURCE_URL}#docker`;
const SUGGESTION_EMAIL = "pranauskis.justas@gmail.com";

export const landingColumn = "mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10";

const navLink =
  "inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium text-muted-foreground focus-ring transition-colors hover:text-foreground aria-[current=page]:text-foreground sm:px-3";

export function ExternalLink({
  href,
  className,
  children,
}: Readonly<{ href: string; className?: string; children: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> ({t("landing.opensInNewTab")})</span>
    </a>
  );
}

function SignOff() {
  return (
    <div className={cn(landingColumn, "flex justify-center pt-16 pb-10 sm:pt-20")}>
      <Brand size="lg" stacked />
    </div>
  );
}

function LandingDoors() {
  const { t } = useTranslation();
  const supportShown = usePublicSettings()?.supportLinkEnabled ?? false;
  const membersId = useId();
  const ownId = useId();
  const supportId = useId();
  const suggestId = useId();
  const suggestionHref = `mailto:${SUGGESTION_EMAIL}?subject=${encodeURIComponent(t("landing.close.suggestSubject"))}`;

  return (
    <div className="border-t">
      <div
        className={cn(
          landingColumn,
          "grid gap-x-12 gap-y-10 py-12 sm:grid-cols-2 sm:py-16",
          supportShown ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <section aria-labelledby={membersId} className="flex flex-col items-start">
          <h2 id={membersId} className="text-lg leading-6 font-semibold">
            {t("landing.close.membersTitle")}
          </h2>
          <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
            {t("landing.close.membersText")}
          </p>
          <Link to="/login" className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}>
            {t("auth.signIn")}
          </Link>
        </section>
        <section aria-labelledby={ownId} className="flex flex-col items-start">
          <h2 id={ownId} className="text-lg leading-6 font-semibold">
            {t("landing.close.ownTitle")}
          </h2>
          <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
            {t("landing.close.ownText")}
          </p>
          <ExternalLink
            href={SETUP_URL}
            className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
          >
            {t("landing.close.ownAction")}
            <ArrowUpRight aria-hidden="true" />
          </ExternalLink>
        </section>
        <section aria-labelledby={suggestId} className="flex flex-col items-start">
          <h2 id={suggestId} className="text-lg leading-6 font-semibold">
            {t("landing.close.suggestTitle")}
          </h2>
          <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
            {t("landing.close.suggestText")}
          </p>
          <a
            href={suggestionHref}
            className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
          >
            <Mail aria-hidden="true" />
            {t("landing.close.suggestAction")}
          </a>
        </section>
        {supportShown ? (
          <section aria-labelledby={supportId} className="flex flex-col items-start">
            <h2 id={supportId} className="text-lg leading-6 font-semibold">
              {t("support.title")}
            </h2>
            <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
              {t("landing.close.supportText")}
            </p>
            <ExternalLink
              href={SUPPORT_URL}
              className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
            >
              <KofiCup className="-m-0.5 size-5" />
              {t("support.link")}
            </ExternalLink>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function LandingShell({
  hero,
  children,
}: Readonly<{ hero: ReactNode; children: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <div className="hero-band relative isolate bg-hero">
          <TornEdge />
          <header
            className={cn(
              landingColumn,
              "landing-header flex items-center justify-between gap-4 pt-4 on-hero sm:pt-6",
            )}
          >
            <Link to="/" className="flex min-h-11 min-w-0 items-center rounded-md focus-ring">
              <Brand compact className="sm:hidden" />
              <Brand className="max-sm:hidden" />
            </Link>
            <nav aria-label={t("landing.nav.label")} className="flex shrink-0 items-center gap-0.5">
              <Link to="/features" className={navLink}>
                {t("landing.nav.features")}
              </Link>
              <Link to="/login" className={navLink}>
                {t("auth.signIn")}
              </Link>
              <LanguageToggle />
              <ThemeToggle />
            </nav>
          </header>
          {hero}
        </div>
        {children}
        <SignOff />
        <LandingDoors />
      </main>

      <footer className="border-t">
        <div
          className={cn(
            landingColumn,
            "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-xs text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            <BrandMark small className="h-4" />
            {t("landing.footer")}
          </span>
          <ExternalLink
            href={SOURCE_URL}
            className="rounded-sm underline-offset-4 focus-ring hover:text-foreground hover:underline"
          >
            {t("landing.sourceLabel")}
          </ExternalLink>
        </div>
      </footer>
    </div>
  );
}
