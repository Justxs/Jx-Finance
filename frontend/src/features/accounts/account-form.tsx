import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useGetHouseholdsEndpoint } from "@/api/generated";
import type { AccountResponse, AccountType, Scope } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isIban, isMoney } from "@/lib/validation";

const accountTypes: AccountType[] = ["checking", "savings", "cash", "other"];

export interface AccountFormValues {
  name: string;
  description: string | null;
  iban: string | null;
  type: AccountType;
  startingBalance: string;
  scope: Scope;
  householdId: string | null;
}

interface FormValues {
  name: string;
  description: string;
  iban: string;
  type: AccountType;
  startingBalance: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: AccountResponse;
  pending: boolean;
  onSubmit: (values: AccountFormValues) => void;
  onCancel?: () => void;
}

export function AccountForm({ initial, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useGetHouseholdsEndpoint();
  const householdList = households.data ?? [];

  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("validation.required"))
        .max(100, t("validation.maxLength", { max: 100 })),
      description: z.string().max(500, t("validation.maxLength", { max: 500 })),
      iban: z.string().refine((value) => !value.trim() || isIban(value), t("validation.iban")),
      type: z.enum(accountTypes),
      startingBalance: z.string().refine(isMoney, t("validation.money")),
      scope: z.enum(["personal", "shared"]),
      householdId: z.string(),
    })
    .refine((value) => value.scope !== "shared" || value.householdId !== "", {
      message: t("validation.required"),
      path: ["householdId"],
    });

  const form = useForm({
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      iban: initial?.iban ?? "",
      type: initial?.type ?? "checking",
      startingBalance: initial?.startingBalance ?? "0.00",
      scope: initial?.scope ?? "personal",
      householdId: initial?.householdId ?? "",
    } satisfies FormValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        description: value.description.trim() || null,
        iban: value.iban.trim() || null,
        type: value.type,
        startingBalance: value.startingBalance,
        scope: value.scope,
        householdId: value.scope === "shared" ? value.householdId : null,
      });
      if (!initial) {
        form.reset();
      }
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
      className="grid gap-4 md:grid-cols-4 md:items-start"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-name">{t("accounts.name")}</Label>
            <Input
              id="account-name"
              placeholder={t("accounts.namePlaceholder")}
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
            <Label htmlFor="account-type">{t("accounts.type")}</Label>
            <Select
              id="account-type"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value as AccountType)}
            >
              {accountTypes.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {t(`accounts.types.${accountType}`)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="startingBalance">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-balance">{t("accounts.startingBalance")}</Label>
            <Input
              id="account-balance"
              inputMode="decimal"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="iban">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="account-iban">{t("accounts.iban")}</Label>
            <Input
              id="account-iban"
              placeholder={t("accounts.ibanPlaceholder")}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="account-description">{t("accounts.description")}</Label>
            <Input
              id="account-description"
              placeholder={t("accounts.descriptionPlaceholder")}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      {householdList.length > 0 ? (
        <>
          <form.Field name="scope">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="account-scope">{t("sharing.scope")}</Label>
                <Select
                  id="account-scope"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as FormValues["scope"])}
                >
                  <option value="personal">{t("sharing.personal")}</option>
                  <option value="shared">{t("sharing.shared")}</option>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.scope}>
            {(scope) =>
              scope === "shared" ? (
                <form.Field name="householdId">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="account-household">{t("sharing.household")}</Label>
                      <Select
                        id="account-household"
                        value={field.state.value}
                        aria-invalid={field.state.meta.errors.length > 0}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      >
                        <option value="">{t("sharing.selectHousehold")}</option>
                        {householdList.map((household) => (
                          <option key={household.id} value={household.id}>
                            {household.name}
                          </option>
                        ))}
                      </Select>
                      <FieldError message={field.state.meta.errors[0]?.message} />
                    </div>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>
        </>
      ) : null}

      <div className="flex gap-2 pt-6">
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={pending || !canSubmit} className="flex-1">
              {initial ? t("actions.save") : t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
