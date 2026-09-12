import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateAssetEndpoint } from "@/api/generated";
import { AssetType } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isMoney } from "@/lib/validation";
import { todayIsoDate } from "@/features/transactions/transaction-form";

const assetTypes = Object.values(AssetType);

interface FormValues {
  name: string;
  type: AssetType;
  currentValue: string;
  asOf: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function AssetForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    type: z.enum(assetTypes),
    currentValue: z.string().refine(isMoney, t("validation.money")),
    asOf: z.string().min(1, t("validation.required")),
  });

  const createMutation = useCreateAssetEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: "",
    type: AssetType.other,
    currentValue: "",
    asOf: todayIsoDate(),
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({ data: value });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="form-grid"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">{t("netWorth.name")}</Label>
            <Input
              id="asset-name"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="asset-type">{t("netWorth.type")}</Label>
            <Select
              id="asset-type"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value as AssetType)}
            >
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`netWorth.assetTypes.${type}`)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="currentValue">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="asset-value">{t("netWorth.currentValue")}</Label>
            <Input
              id="asset-value"
              inputMode="decimal"
              placeholder="0.00"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="asOf">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="asset-as-of">{t("netWorth.asOf")}</Label>
            <DatePicker
              id="asset-as-of"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>

      <div className="flex items-end justify-end gap-2 col-span-full">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={createMutation.isPending || !canSubmit}>
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
