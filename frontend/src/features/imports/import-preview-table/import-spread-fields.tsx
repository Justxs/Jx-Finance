import { useTranslation } from "react-i18next";
import type { SpreadDirection } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import {
  SPREAD_CUSTOM,
  spreadDirectionOptions,
  spreadOptions,
} from "@/features/transactions/spread-fields/spread-choice";

interface Spread {
  spreadMonths: number | null;
  spreadDirection: SpreadDirection;
}

interface Props extends Spread {
  id: string;
  onChange: (next: Spread) => void;
}

export function ImportSpreadFields({
  id,
  spreadMonths,
  spreadDirection,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <FieldShell id={`${id}-months`} label={t("transactions.spread.label")}>
        <SelectField
          id={`${id}-months`}
          value={spreadMonths ? String(spreadMonths) : ""}
          options={spreadOptions(t).filter((option) => option.value !== SPREAD_CUSTOM)}
          onChange={(next) =>
            onChange({ spreadMonths: next ? Number(next) : null, spreadDirection })
          }
        />
      </FieldShell>
      {spreadMonths ? (
        <FieldShell id={`${id}-direction`} label={t("transactions.spread.direction")}>
          <SelectField
            id={`${id}-direction`}
            value={spreadDirection}
            options={spreadDirectionOptions(t)}
            onChange={(next) =>
              onChange({
                spreadMonths,
                spreadDirection: next === "backward" ? "backward" : "forward",
              })
            }
          />
        </FieldShell>
      ) : null}
    </>
  );
}
