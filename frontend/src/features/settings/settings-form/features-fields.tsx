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

const featureGroups: { titleKey: TranslationKey; features: FeatureKey[] }[] = [
  { titleKey: "settings.featureGroups.plan", features: ["budgets", "goals", "recurringBills"] },
  { titleKey: "settings.featureGroups.review", features: ["netWorth", "investments", "reports"] },
  {
    titleKey: "settings.featureGroups.ledger",
    features: ["import", "categorizationRules", "households", "multiCurrency"],
  },
];

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
