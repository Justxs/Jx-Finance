import { useTranslation } from "react-i18next";
import type { SpreadDirection } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
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
  label: string;
  onChange: (next: Spread) => void;
}

export function ImportSpreadPicker({
  id,
  label,
  spreadMonths,
  spreadDirection,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="link-muted"
            size="inline"
            aria-label={label}
            className="min-h-6"
          />
        }
      >
        {spreadMonths
          ? t("transactions.spread.chip", { months: spreadMonths })
          : t("imports.spread")}
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-64 space-y-3">
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
      </PopoverContent>
    </Popover>
  );
}
