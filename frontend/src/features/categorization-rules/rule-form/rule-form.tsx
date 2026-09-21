import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCategorizationRule, useUpdateCategorizationRule } from "@/api/generated";
import type {
  AccountResponse,
  CategorizationRuleResponse,
  CategoryResponse,
  DescriptionMatch,
  TagResponse,
} from "@/api/generated/model";
import { createCategorizationRuleBodyNameMax } from "@/api/schemas/categorization-rules/categorization-rules.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { silent, upsert } from "@/lib/mutations";
import { nameById, namedOptions } from "@/lib/options";
import { normalizeMoney, optionalNonNegativeMoney, requiredText } from "@/lib/validation";
import { actionText, ruleActionNames } from "./rule-summary";
import { RuleTester } from "./rule-tester";

const PATTERN_MAX = 200;

interface FormValues {
  name: string;
  match: DescriptionMatch;
  pattern: string;
  accountId: string;
  minAmount: string;
  maxAmount: string;
  categoryId: string;
  tagIds: string[];
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  initial?: CategorizationRuleResponse;
  onSaved: () => void;
  onCancel: () => void;
}

function FormSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <fieldset className="space-y-3 border-t border-rule pt-4">
      <legend className="float-left -mt-1 mb-2 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function RuleForm({
  accounts,
  categories,
  tags,
  initial,
  onSaved,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [sample, setSample] = useState("");
  const [sampleAmount, setSampleAmount] = useState("");

  const schema = z
    .object({
      name: requiredText(t, createCategorizationRuleBodyNameMax),
      match: z.enum(["contains", "startsWith", "exact"]),
      pattern: requiredText(t, PATTERN_MAX),
      accountId: z.string(),
      minAmount: optionalNonNegativeMoney(t),
      maxAmount: optionalNonNegativeMoney(t),
      categoryId: z.string(),
      tagIds: z.array(z.string()),
    })
    .refine((value) => value.categoryId !== "" || value.tagIds.length > 0, {
      message: t("categorizationRules.actionHint"),
      path: ["categoryId"],
    })
    .refine(
      (value) =>
        value.minAmount.trim() === "" ||
        value.maxAmount.trim() === "" ||
        Number(normalizeMoney(value.maxAmount)) >= Number(normalizeMoney(value.minAmount)),
      { message: t("categorizationRules.amountRangeInvalid"), path: ["maxAmount"] },
    );

  const { create, update, pending, error } = upsert(
    useCreateCategorizationRule(silent({ onSuccess: onSaved })),
    useUpdateCategorizationRule(silent({ onSuccess: onSaved })),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    match: initial?.match ?? "contains",
    pattern: initial?.pattern ?? "",
    accountId: initial?.accountId ?? "",
    minAmount: initial?.minAmount ?? "",
    maxAmount: initial?.maxAmount ?? "",
    categoryId: initial?.categoryId ?? "",
    tagIds: initial?.tagIds ?? [],
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const data = {
        name: value.name.trim(),
        match: value.match,
        pattern: value.pattern.trim(),
        tagIds: value.tagIds,
        accountId: value.accountId || null,
        minAmount: value.minAmount.trim() ? normalizeMoney(value.minAmount) : null,
        maxAmount: value.maxAmount.trim() ? normalizeMoney(value.maxAmount) : null,
        categoryId: value.categoryId || null,
      };

      return initial?.id ? update({ id: initial.id, data }) : create({ data });
    },
  });

  const values = form.state.values;
  const names = ruleActionNames(
    { categoryId: values.categoryId || null, tagIds: values.tagIds },
    nameById(categories),
    nameById(tags),
  );

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="rule-name"
              label={t("categorizationRules.name")}
              placeholder={t("categorizationRules.namePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>

        <FormSection title={t("categorizationRules.condition")}>
          <FormGrid>
            <form.Field name="match">
              {(field) => (
                <field.SelectFieldControl
                  id="rule-match"
                  label={t("categorizationRules.match")}
                  options={[
                    { value: "contains", label: t("categorizationRules.matches.contains") },
                    { value: "startsWith", label: t("categorizationRules.matches.startsWith") },
                    { value: "exact", label: t("categorizationRules.matches.exact") },
                  ]}
                />
              )}
            </form.Field>
            <form.Field name="pattern">
              {(field) => (
                <field.TextField
                  id="rule-pattern"
                  label={t("categorizationRules.pattern")}
                  placeholder={t("categorizationRules.patternPlaceholder")}
                  hint={t("categorizationRules.patternHint")}
                />
              )}
            </form.Field>
          </FormGrid>
        </FormSection>

        <FormSection title={t("categorizationRules.narrowing")}>
          <FormGrid>
            <form.Field name="accountId">
              {(field) => (
                <field.SelectFieldControl
                  id="rule-account"
                  label={t("categorizationRules.account")}
                  options={namedOptions(accounts, t("categorizationRules.anyAccount"))}
                  className="col-span-full"
                />
              )}
            </form.Field>
            <form.Field name="minAmount">
              {(field) => (
                <field.MoneyInputField
                  id="rule-min-amount"
                  label={t("categorizationRules.minAmount")}
                  placeholder=""
                />
              )}
            </form.Field>
            <form.Field name="maxAmount">
              {(field) => (
                <field.MoneyInputField
                  id="rule-max-amount"
                  label={t("categorizationRules.maxAmount")}
                  placeholder=""
                  hint={t("categorizationRules.amountHint")}
                />
              )}
            </form.Field>
          </FormGrid>
        </FormSection>

        <FormSection title={t("categorizationRules.action")}>
          <form.Field name="categoryId">
            {(field) => (
              <field.SelectFieldControl
                id="rule-category"
                label={t("categorizationRules.category")}
                options={namedOptions(categories, t("categorizationRules.noCategory"))}
                hint={t("categorizationRules.categoryTypeHint")}
              />
            )}
          </form.Field>
          <form.Field name="tagIds">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="rule-tags">{t("categorizationRules.tags")}</Label>
                <TagPicker
                  id="rule-tags"
                  tags={tags}
                  value={field.value}
                  onChange={(next) => field.handleChange(next)}
                  aria-label={t("categorizationRules.tags")}
                />
              </div>
            )}
          </form.Field>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t("categorizationRules.actionHint")}
          </p>
        </FormSection>

        <RuleTester
          match={values.match}
          pattern={values.pattern}
          action={actionText(t, names.categoryName, names.tagNames)}
          sample={sample}
          sampleAmount={sampleAmount}
          minAmount={values.minAmount}
          maxAmount={values.maxAmount}
          onSampleChange={setSample}
          onSampleAmountChange={setSampleAmount}
        />

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={t(initial ? "actions.save" : "actions.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
