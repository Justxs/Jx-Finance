import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Rows } from "@/components/ui/rows/rows";
import { LandingShell, landingColumn } from "@/features/landing/landing-shell/landing-shell";
import {
  BudgetCard,
  ImportCard,
  NetWorthCard,
  ReminderCard,
  SettleUpCard,
} from "@/features/landing/showcase/showcase";
import { cn } from "@/lib/utils";

export const featureGroups = [
  { key: "everyday", features: ["import", "rules", "receipts", "recurring"] },
  { key: "plan", features: ["budgets", "goals", "forecast"] },
  { key: "household", features: ["sharing", "settleUp", "currencies"] },
  { key: "wealth", features: ["netWorth", "investments"] },
  { key: "review", features: ["reports", "export", "notifications", "security"] },
] as const;

type FeatureGroup = (typeof featureGroups)[number];

const groupVisuals = {
  everyday: ImportCard,
  plan: BudgetCard,
  household: SettleUpCard,
  wealth: NetWorthCard,
  review: ReminderCard,
} as const;

function GroupSection({ group }: Readonly<{ group: FeatureGroup }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const Visual = groupVisuals[group.key];

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-x-16 gap-y-6 py-12 lg:grid-cols-[5fr_8fr] lg:py-16"
    >
      <div className="lg:sticky lg:top-8 lg:self-start">
        <h2 id={titleId} className="font-serif text-page-title font-semibold">
          {t(`landing.featuresPage.groups.${group.key}`)}
        </h2>
        <Visual className="mt-5 max-w-sm" />
      </div>
      <Rows className="lg:-mt-3">
        {group.features.map((feature) => (
          <li key={feature} className="py-3">
            <h3 className="text-base font-semibold">
              {t(`landing.featuresPage.items.${feature}.title`)}
            </h3>
            <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
              {t(`landing.featuresPage.items.${feature}.text`)}
            </p>
            <p className="mt-1.5 max-w-prose text-sm">
              <span className="font-medium">{t("landing.featuresPage.example")}</span>{" "}
              {t(`landing.featuresPage.items.${feature}.example`)}
            </p>
          </li>
        ))}
      </Rows>
    </section>
  );
}

export function FeaturesPage() {
  const { t } = useTranslation();

  const hero = (
    <div className={cn(landingColumn, "pt-12 pb-14 on-hero sm:pt-16 lg:pt-24 lg:pb-20")}>
      <h1 className="max-w-[18ch] font-serif text-stat-lg font-semibold text-balance sm:text-display-sm lg:text-display">
        {t("landing.featuresPage.title")}
      </h1>
      <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
        {t("landing.featuresPage.lead")}
      </p>
    </div>
  );

  return (
    <LandingShell hero={hero}>
      <div className={cn(landingColumn, "pb-4")}>
        <div className="divide-y divide-border">
          {featureGroups.map((group) => (
            <GroupSection key={group.key} group={group} />
          ))}
        </div>
      </div>
    </LandingShell>
  );
}
