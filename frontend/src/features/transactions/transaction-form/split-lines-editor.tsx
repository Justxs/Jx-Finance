import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { emptyLine } from "./line-form-value";
import type { TransactionFormApi } from "./transaction-form";

interface Props {
  form: TransactionFormApi;
  categories: CategoryResponse[];
}

interface LineRowProps {
  form: TransactionFormApi;
  categories: CategoryResponse[];
  index: number;
  onRemove: () => void;
}

function SplitLineRow({ form, categories, index, onRemove }: Readonly<LineRowProps>) {
  const { t } = useTranslation();

  return (
    <div className="form-grid">
      <form.Field name={`lines[${index}].categoryId`}>
        {(field) => (
          <SelectField
            aria-label={t("transactions.lineCategory")}
            value={field.value}
            onBlur={field.handleBlur}
            onChange={(value) => field.handleChange(value)}
            options={[
              { value: "", label: t("transactions.uncategorized") },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
        )}
      </form.Field>
      <form.Field name={`lines[${index}].amount`}>
        {(field) => (
          <Input
            aria-label={t("transactions.lineAmount")}
            inputMode="decimal"
            placeholder="0.00"
            value={field.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <form.Field name={`lines[${index}].description`}>
        {(field) => (
          <Input
            aria-label={t("transactions.lineDescription")}
            placeholder={t("transactions.lineDescription")}
            value={field.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("transactions.removeLine")}
        tooltip={t("transactions.removeLine")}
        onClick={onRemove}
      >
        <X />
      </Button>
    </div>
  );
}

function SplitLineList({ form, categories }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <form.ArrayField name="lines">
      {(linesField) => (
        <div className="col-span-full space-y-3">
          <form.Field name="lines">
            {(errorField) => <FieldError message={errorField.errors[0]?.message} />}
          </form.Field>
          {linesField.value.map((line, index) => (
            <SplitLineRow
              key={line.id}
              form={form}
              categories={categories}
              index={index}
              onRemove={() => linesField.removeValue(index)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => linesField.pushValue(emptyLine())}
          >
            <Plus />
            {t("transactions.addLine")}
          </Button>
        </div>
      )}
    </form.ArrayField>
  );
}

export function SplitLinesEditor({ form, categories }: Readonly<Props>) {
  return (
    <form.Subscribe selector={(state) => state.values.isSplit}>
      {(isSplit) =>
        isSplit ? (
          <form.Field name="type">
            {(typeField) => (
              <SplitLineList
                form={form}
                categories={categories.filter((c) => c.type === typeField.value)}
              />
            )}
          </form.Field>
        ) : null
      }
    </form.Subscribe>
  );
}
