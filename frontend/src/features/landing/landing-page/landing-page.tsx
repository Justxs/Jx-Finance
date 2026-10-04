import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button/button";
import {
  ExternalLink,
  LandingShell,
  SOURCE_URL,
  landingColumn,
} from "@/features/landing/landing-shell/landing-shell";
import { SampleLedger } from "@/features/landing/sample-ledger/sample-ledger";
import { BudgetCard, ImportCard, NetWorthCard } from "@/features/landing/showcase/showcase";
import { useNumberFormat } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

const facts = [
  { key: "bank", figure: 0 },
  { key: "privacy", figure: 0 },
  { key: "currencies", figure: 30 },
  { key: "languages", figure: 2 },
  { key: "price", figure: 0, price: true },
] as const;

function Statement() {
  const { t } = useTranslation();
  const titleId = useId();
  const number = useNumberFormat();
  const euros = useNumberFormat({
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <section
      aria-labelledby={titleId}
      className={cn(landingColumn, "pt-12 pb-12 sm:pb-16 lg:pt-56")}
    >
      <h2 id={titleId} className="font-serif text-page-title font-semibold">
        {t("landing.statement.title")}
      </h2>
      <dl className="mt-5 divide-y divide-border border-y border-rule">
        {facts.map((fact) => (
          <div
            key={fact.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_6rem] sm:items-baseline lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_8rem]"
          >
            <dt className="col-start-1 row-start-1 text-sm font-semibold">
              {t(`landing.statement.${fact.key}.label`)}
            </dt>
            <dd className="col-span-2 col-start-1 row-start-2 max-w-prose text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1">
              {t(`landing.statement.${fact.key}.text`)}
            </dd>
            <dd className="col-start-2 row-start-1 text-right font-serif text-stat font-semibold tabular-nums sm:col-start-3">
              {"price" in fact ? euros.format(fact.figure) : number.format(fact.figure)}
            </dd>
          </div>
        ))}
      </dl>
      <Link to="/features" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
        {t("landing.seeFeatures")}
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

function ShowcaseStage() {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:items-start lg:-mb-44">
      <SampleLedger />
      <div className="hidden gap-4 sm:grid sm:pt-16">
        <NetWorthCard delay={160} />
        <BudgetCard delay={320} />
        <ImportCard delay={480} />
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();

  const hero = (
    <div
      className={cn(
        landingColumn,
        "grid items-start gap-x-12 gap-y-12 pt-12 pb-12 sm:pt-16 lg:grid-cols-[4fr_8fr] lg:pt-20 lg:pb-0",
      )}
    >
      <div className="on-hero lg:pt-4">
        <h1 className="font-serif text-stat-lg font-semibold text-balance sm:text-display-sm">
          {t("landing.title")}
        </h1>
        <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
          {t("landing.lead")}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/login" className={cn(buttonVariants({ size: "lg" }))}>
            {t("auth.signIn")}
          </Link>
          <ExternalLink
            href={SOURCE_URL}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {t("landing.source")}
            <ArrowUpRight aria-hidden="true" />
          </ExternalLink>
        </div>
      </div>
      <ShowcaseStage />
    </div>
  );

  return (
    <LandingShell hero={hero}>
      <Statement />
    </LandingShell>
  );
}
