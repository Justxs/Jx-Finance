import { useTranslation } from "react-i18next";
import { FirstDayOfWeek } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { optionsOf } from "@/lib/options";

const regionalFieldGroup = defineAppFieldGroup(({ strict }) => ({
  defaultLanguage: strict<string>(),
  timeZone: strict<string>(),
  firstDayOfWeek: strict<FirstDayOfWeek>(),
}));

interface Props {
  fields: typeof regionalFieldGroup.fields;
  savedTimeZone: string;
}

const languages = ["en", "lt"] as const;

function timeZones(current: string) {
  const supported = Intl.supportedValuesOf("timeZone");
  return supported.includes(current) ? supported : [current, ...supported];
}

function zoneRegion(zone: string) {
  const slash = zone.indexOf("/");
  return slash === -1 ? "" : zone.slice(0, slash);
}

function zoneCity(zone: string) {
  const slash = zone.indexOf("/");
  return (slash === -1 ? zone : zone.slice(slash + 1)).replaceAll("_", " ").replaceAll("/", " / ");
}

function zoneRegions(zones: readonly string[]) {
  return [...new Set(zones.map(zoneRegion))].toSorted((a, b) => a.localeCompare(b));
}

function RegionalFieldsGroup({ fields, savedTimeZone }: Readonly<Props>) {
  const { t } = useTranslation();
  const zones = timeZones(savedTimeZone);

  return (
    <FormGrid className="mt-4 max-w-3xl">
      <fields.Field name="defaultLanguage">
        {(field) => (
          <field.SelectFieldControl
            id="settings-language"
            label={t("settings.regional.language")}
            hint={t("settings.regional.languageHint")}
            options={optionsOf(languages, (language) =>
              t(`settings.regional.languages.${language}`),
            )}
          />
        )}
      </fields.Field>

      <fields.Field name="timeZone">
        {(field) => (
          <FieldShell
            id="settings-time-zone"
            label={t("settings.regional.timeZone")}
            hint={t("settings.regional.timeZoneHint")}
          >
            <div className="flex gap-2">
              <div className="w-2/5 min-w-0">
                <SelectField
                  aria-label={t("settings.regional.timeZoneRegion")}
                  value={zoneRegion(field.value)}
                  onChange={(region) => {
                    const first = zones.find((zone) => zoneRegion(zone) === region);
                    if (first && region !== zoneRegion(field.value)) {
                      field.handleChange(first);
                    }
                  }}
                  options={optionsOf(
                    zoneRegions(zones),
                    (region) => region || t("settings.regional.timeZoneOther"),
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <SelectField
                  id="settings-time-zone"
                  aria-describedby="settings-time-zone-hint"
                  value={field.value}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  options={zones
                    .filter((zone) => zoneRegion(zone) === zoneRegion(field.value))
                    .map((zone) => ({ value: zone, label: zoneCity(zone) }))}
                />
              </div>
            </div>
          </FieldShell>
        )}
      </fields.Field>

      <fields.Field name="firstDayOfWeek">
        {(field) => (
          <field.SelectFieldControl
            id="settings-first-day"
            label={t("settings.regional.firstDayOfWeek")}
            options={optionsOf(Object.values(FirstDayOfWeek), (day) =>
              t(`settings.regional.days.${day}`),
            )}
          />
        )}
      </fields.Field>
    </FormGrid>
  );
}

export const RegionalFields = regionalFieldGroup.bindComponent(RegionalFieldsGroup, "fields");
