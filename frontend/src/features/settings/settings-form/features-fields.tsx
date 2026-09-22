import { useTranslation } from "react-i18next";
import type { FeatureFlags } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Rows } from "@/components/ui/rows/rows";
import type { FeatureKey } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";

const featuresFieldGroup = defineAppFieldGroup(({ strict }) => ({
  features: strict<FeatureFlags>(),
}));

interface Props {
  fields: typeof featuresFieldGroup.fields;
}

type FeatureGroup = "plan" | "review" | "ledger";

const groupOf = {
  budgets: "plan",
  goals: "plan",
  recurringBills: "plan",
  netWorth: "review",
  investments: "review",
  reports: "review",
  import: "ledger",
  categorizationRules: "ledger",
  households: "ledger",
  multiCurrency: "ledger",
} as const satisfies Record<FeatureKey, FeatureGroup>;

const groupTitles: Record<FeatureGroup, TranslationKey> = {
  plan: "settings.featureGroups.plan",
  review: "settings.featureGroups.review",
  ledger: "settings.featureGroups.ledger",
};

const groupOrder: readonly FeatureGroup[] = ["plan", "review", "ledger"];

function isFeatureKey(value: string): value is FeatureKey {
  return value in groupOf;
}

const featureKeys = Object.keys(groupOf).filter(isFeatureKey);

const featureGroups = groupOrder.map((group) => ({
  titleKey: groupTitles[group],
  features: featureKeys.filter((feature) => groupOf[feature] === group),
}));

function FeaturesFieldsGroup({ fields }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-3">
      {featureGroups.map((group) => (
        <fieldset key={group.titleKey} className="min-w-0">
          <legend className="text-sm font-semibold">{t(group.titleKey)}</legend>
          <Rows className="mt-1">
            {group.features.map((feature) => (
              <fields.Field key={feature} name={`features.${feature}`}>
                {(field) => (
                  <li className="py-2.5">
                    <field.CheckboxField
                      id={`settings-feature-${feature}`}
                      label={t(`settings.features.items.${feature}.name`)}
                      hint={t(`settings.features.items.${feature}.hint`)}
                    />
                  </li>
                )}
              </fields.Field>
            ))}
          </Rows>
        </fieldset>
      ))}
    </div>
  );
}

export const FeaturesFields = featuresFieldGroup.bindComponent(FeaturesFieldsGroup, "fields");
