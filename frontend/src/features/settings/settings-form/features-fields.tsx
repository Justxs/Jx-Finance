import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FeatureFlags } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { Rows } from "@/components/ui/rows/rows";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import type { TranslationKey } from "@/lib/i18n";
import type { FeatureKey } from "@/lib/settings";

const featuresFieldGroup = defineAppFieldGroup(({ strict }) => ({
  features: strict<FeatureFlags>(),
}));

interface Props {
  fields: typeof featuresFieldGroup.fields;
}

interface ChipsProps extends Props {
  notes: Partial<Record<FeatureKey, string>>;
}

type FeatureGroup = "plan" | "review" | "ledger";

const groupOf = {
  budgets: "plan",
  goals: "plan",
  recurringBills: "plan",
  cashFlowForecast: "plan",
  netWorth: "review",
  investments: "review",
  reports: "review",
  import: "ledger",
  categorizationRules: "ledger",
  unusualAmounts: "review",
  monthClose: "review",
  households: "ledger",
  people: "ledger",
  multiCurrency: "ledger",
  receiptReading: "ledger",
  apiTokens: "ledger",
  locations: "ledger",
  learnedCategories: "ledger",
  payeeNames: "ledger",
  attachments: "ledger",
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

export const featureGroups = groupOrder.map((group) => ({
  name: group,
  titleKey: groupTitles[group],
  features: featureKeys.filter((feature) => groupOf[feature] === group),
}));

function FeaturesFieldsGroup({ fields }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 grid gap-x-10 gap-y-6 xl:grid-cols-3">
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
                      label={
                        <span className="min-w-0 wrap-break-word">
                          {t(`settings.features.items.${feature}.name`)}
                        </span>
                      }
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

const chipClass =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-base ease-out-expo select-none hover:text-foreground has-data-checked:border-primary/50 has-data-checked:bg-accent has-data-checked:text-foreground dark:bg-input/30 dark:has-data-checked:bg-accent pointer-coarse:h-10";

function FeatureChipsGroup({ fields, notes }: Readonly<ChipsProps>) {
  const { t } = useTranslation();
  const noted = featureKeys.filter((feature) => notes[feature]);

  return (
    <>
      <div className="mt-6 divide-y border-y">
        {featureGroups.map((group) => (
          <div
            key={group.name}
            role="group"
            aria-labelledby={`feature-group-${group.name}`}
            className="grid gap-x-6 gap-y-2 py-3.5 sm:grid-cols-[7rem_minmax(0,1fr)]"
          >
            <span id={`feature-group-${group.name}`} className="text-sm font-semibold sm:leading-8">
              {t(group.titleKey)}
            </span>
            <ul className="flex flex-wrap gap-2">
              {group.features.map((feature) => (
                <li key={feature}>
                  <fields.Field name={`features.${feature}`}>
                    {(field) => (
                      <Tooltip content={t(`settings.features.items.${feature}.example`)}>
                        <label className={chipClass}>
                          <Checkbox
                            id={`feature-chip-${feature}`}
                            checked={field.value}
                            onCheckedChange={(next) => field.handleChange(next)}
                            aria-describedby={
                              notes[feature] ? `feature-chip-${feature}-note` : undefined
                            }
                          />
                          {t(`settings.features.items.${feature}.name`)}
                          {notes[feature] ? (
                            <TriangleAlert
                              aria-hidden="true"
                              className="size-3.5 text-muted-foreground"
                            />
                          ) : null}
                        </label>
                      </Tooltip>
                    )}
                  </fields.Field>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {noted.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {noted.map((feature) => (
            <li key={feature} id={`feature-chip-${feature}-note`} className="flex gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium text-foreground">
                  {t(`settings.features.items.${feature}.name`)}
                </span>
                {" · "}
                {notes[feature]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export const FeatureChips = featuresFieldGroup.bindComponent(FeatureChipsGroup, "fields");
