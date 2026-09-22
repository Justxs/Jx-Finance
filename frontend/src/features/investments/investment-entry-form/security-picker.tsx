import type { FieldWithValue } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SecurityResponse } from "@/api/generated/model";
import { FieldShell, fieldAria } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";

const PICKER_ID = "entry-security";

interface Props {
  field: FieldWithValue<string>;
  securities: readonly SecurityResponse[];
  required: boolean;
  onAdd: () => void;
}

export function SecurityPicker({ field, securities, required, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const { error, ...aria } = fieldAria(field, { id: PICKER_ID });

  return (
    <FieldShell
      id={PICKER_ID}
      label={required ? t("investments.entry.security") : t("investments.entry.securityOptional")}
      error={error}
      className="col-span-full"
    >
      <div className="flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <SelectField
            {...aria}
            id={PICKER_ID}
            value={field.value}
            placeholder={t("investments.entry.chooseSecurity")}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            options={[
              ...(required ? [] : [{ value: "", label: t("investments.entry.noSecurity") }]),
              ...securities.map((security) => ({
                value: security.id,
                label: `${security.symbol} · ${security.name}`,
              })),
            ]}
          />
        </div>
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus />
          {t("investments.securities.add")}
        </Button>
      </div>
    </FieldShell>
  );
}
