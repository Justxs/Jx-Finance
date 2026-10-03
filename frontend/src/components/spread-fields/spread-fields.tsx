import { useTranslation } from "react-i18next";
import { defineAppFieldGroup } from "@/components/form";
import {
  SPREAD_CUSTOM,
  SPREAD_MAX_MONTHS,
  SPREAD_MIN_MONTHS,
  spreadDirectionOptions,
  spreadOptions,
} from "./spread-choice";

const spreadFieldGroup = defineAppFieldGroup(({ strict }) => ({
  spread: strict<string>(),
  spreadCustom: strict<string>(),
  spreadDirection: strict<string>(),
}));

interface Props {
  fields: typeof spreadFieldGroup.fields;
  idPrefix: string;
}

function SpreadFieldsGroup({ fields, idPrefix }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <fields.Field name="spread">
      {(spreadField) => (
        <>
          <spreadField.SelectFieldControl
            id={`${idPrefix}-spread`}
            label={t("transactions.spread.label")}
            hint={t("transactions.spread.hint")}
            options={spreadOptions(t)}
          />

          {spreadField.value === SPREAD_CUSTOM ? (
            <fields.Field name="spreadCustom">
              {(field) => (
                <field.TextField
                  id={`${idPrefix}-spread-custom`}
                  label={t("transactions.spread.customLabel")}
                  type="number"
                  inputMode="numeric"
                  min={SPREAD_MIN_MONTHS}
                  max={SPREAD_MAX_MONTHS}
                />
              )}
            </fields.Field>
          ) : null}

          {spreadField.value ? (
            <fields.Field name="spreadDirection">
              {(field) => (
                <field.SelectFieldControl
                  id={`${idPrefix}-spread-direction`}
                  label={t("transactions.spread.direction")}
                  options={spreadDirectionOptions(t)}
                />
              )}
            </fields.Field>
          ) : null}
        </>
      )}
    </fields.Field>
  );
}

export const SpreadFields = spreadFieldGroup.bindComponent(SpreadFieldsGroup, "fields");
