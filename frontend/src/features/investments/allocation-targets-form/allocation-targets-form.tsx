import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSaveAllocationTargets } from "@/api/generated";
import { AllocationDimension, type AllocationTargetsResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FieldError, Hint } from "@/components/ui/field-error";
import { useNumberFormat } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { silentMutation } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { isNonNegativeMoney, normalizeMoney } from "@/lib/validation";

const dimensions = Object.values(AllocationDimension);
const WHOLE = 10_000;

export interface TargetChoice {
  id: string;
  name: string;
}

interface ShareValue {
  key: string;
  name: string;
  share: string;
}

interface Props {
  targets: AllocationTargetsResponse;
  dimension: AllocationDimension;
  choices: Record<AllocationDimension, readonly TargetChoice[]>;
  onSaved: (saved: AllocationTargetsResponse) => void;
  onCancel: () => void;
}

function isFilled(value: ShareValue) {
  return value.share.trim() !== "";
}

function isShare(value: string) {
  return isNonNegativeMoney(value) && toCents(value) <= WHOLE;
}

function totalOf(values: readonly ShareValue[]) {
  return values
    .filter((value) => isFilled(value) && isShare(value.share))
    .reduce((sum, value) => sum + toCents(value.share), 0);
}

export function AllocationTargetsForm({
  targets,
  dimension,
  choices,
  onSaved,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const number = useNumberFormat({ maximumFractionDigits: 2 });
  const save = useSaveAllocationTargets({
    mutation: { ...silentMutation, onSuccess: (saved) => onSaved(saved) },
  });

  function sharesOf(chosen: AllocationDimension): ShareValue[] {
    const saved = targets.dimension === chosen ? targets.targets : [];
    return choices[chosen].map((choice) => ({
      key: choice.id,
      name: choice.name,
      share: saved.find((target) => target.key === choice.id)?.share ?? "",
    }));
  }

  const schema = z
    .object({
      dimension: z.enum(AllocationDimension),
      shares: z.array(z.object({ key: z.string(), name: z.string(), share: z.string() })),
    })
    .superRefine((value, ctx) => {
      for (const [index, item] of value.shares.entries()) {
        if (isFilled(item) && !isShare(item.share)) {
          ctx.addIssue({
            code: "custom",
            message: t("investments.allocationTargets.shareInvalid"),
            path: ["shares", index, "share"],
          });
        }
      }
      const filled = value.shares.filter(isFilled);
      const total = totalOf(filled);
      if (filled.length > 0 && filled.every((item) => isShare(item.share)) && total !== WHOLE) {
        ctx.addIssue({
          code: "custom",
          message: t("investments.allocationTargets.totalInvalid", {
            total: number.format(total / 100),
          }),
          path: ["shares"],
        });
      }
    });

  const form = useServerForm({
    defaultValues: { dimension, shares: sharesOf(dimension) },
    schema,
    submit: (value) =>
      save.mutateAsync({
        data: {
          dimension: value.dimension,
          targets: value.shares
            .filter(isFilled)
            .map((item) => ({ key: item.key, share: normalizeMoney(item.share) })),
        },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="dimension">
          {(field) => (
            <field.SelectFieldControl
              id="allocation-target-dimension"
              kind="segments"
              label={t("investments.allocationTargets.dimension")}
              options={optionsOf(dimensions, (option) =>
                t(`investments.allocationViews.${option}`),
              )}
              onValueChange={(chosen) =>
                form.setFieldValue("shares", sharesOf(z.enum(AllocationDimension).parse(chosen)))
              }
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.shares}>
          {(shares) => (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">
                {t("investments.allocationTargets.shares")}
              </legend>
              {shares.map((item, index) => (
                <form.Field key={item.key} name={`shares[${index}].share`}>
                  {(field) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-3">
                      <span className="truncate pt-2 text-sm" title={item.name}>
                        {item.name}
                      </span>
                      <field.TextField
                        id={`allocation-target-${index}`}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={t("investments.allocationTargets.shareLabel", {
                          name: item.name,
                        })}
                      />
                    </div>
                  )}
                </form.Field>
              ))}
              <Hint role="status">
                {t("investments.allocationTargets.total", {
                  total: number.format(totalOf(shares) / 100),
                })}
              </Hint>
              <form.Field name="shares">
                {(field) => <FieldError message={field.errors[0]?.message} />}
              </form.Field>
              <Hint>{t("investments.allocationTargets.clearHint")}</Hint>
            </fieldset>
          )}
        </form.Subscribe>

        <FormError error={save.error} />

        <form.FormActions
          pending={save.isPending}
          submitLabel={t("actions.save")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
