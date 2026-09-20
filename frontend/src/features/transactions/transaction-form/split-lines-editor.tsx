import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, FlowType } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { namedOptions } from "@/lib/options";
import { emptyLine, type LineFormValue } from "./line-form-value";

const splitLinesFieldGroup = defineAppFieldGroup(({ strict }) => ({
  type: strict<FlowType>(),
  isSplit: strict<boolean>(),
  lines: strict<LineFormValue[]>(),
}));

type SplitLinesFields = typeof splitLinesFieldGroup.fields;

interface Props {
  fields: SplitLinesFields;
  categories: CategoryResponse[];
}

interface LineRowProps {
  fields: SplitLinesFields;
  categories: CategoryResponse[];
  index: number;
  onRemove: () => void;
}

function SplitLineRow({ fields, categories, index, onRemove }: Readonly<LineRowProps>) {
  const { t } = useTranslation();

  return (
    <FormGrid>
      <fields.Field name={`lines[${index}].categoryId`}>
        {(field) => (
          <field.SelectFieldControl
            id={`tx-line-${index}-category`}
            aria-label={t("transactions.lineCategory")}
            options={namedOptions(categories, t("transactions.uncategorized"))}
          />
        )}
      </fields.Field>
      <fields.Field name={`lines[${index}].amount`}>
        {(field) => (
          <field.MoneyInputField
            id={`tx-line-${index}-amount`}
            aria-label={t("transactions.lineAmount")}
          />
        )}
      </fields.Field>
      <fields.Field name={`lines[${index}].description`}>
        {(field) => (
          <field.TextField
            id={`tx-line-${index}-description`}
            aria-label={t("transactions.lineDescription")}
            placeholder={t("transactions.lineDescription")}
          />
        )}
      </fields.Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("transactions.removeLine")}
        onClick={onRemove}
      >
        <X />
      </Button>
    </FormGrid>
  );
}

function SplitLineList({ fields, categories }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <fields.ArrayField name="lines">
      {(linesField) => (
        <div className="col-span-full space-y-3">
          <fields.Field name="lines">
            {(errorField) => <FieldError message={errorField.errors[0]?.message} />}
          </fields.Field>
          {linesField.value.map((line, index) => (
            <SplitLineRow
              key={line.id}
              fields={fields}
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
    </fields.ArrayField>
  );
}

function SplitLinesGroup({ fields, categories }: Readonly<Props>) {
  return (
    <fields.Field name="isSplit">
      {(splitField) =>
        splitField.value ? (
          <fields.Field name="type">
            {(typeField) => (
              <SplitLineList
                fields={fields}
                categories={categories.filter((c) => c.type === typeField.value)}
              />
            )}
          </fields.Field>
        ) : null
      }
    </fields.Field>
  );
}

export const SplitLinesEditor = splitLinesFieldGroup.bindComponent(SplitLinesGroup, "fields");
