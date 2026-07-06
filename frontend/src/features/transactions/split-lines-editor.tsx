import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { emptyLine, type FormValues } from "./transaction-form";

type TransactionFormApi = ReactFormExtendedApi<
  FormValues,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, any, any, any, any, any, any, any, any, any, any
>;

interface Props {
  form: TransactionFormApi;
  categories: CategoryResponse[];
}

export function SplitLinesEditor({ form, categories }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <form.Subscribe selector={(state) => state.values.isSplit}>
      {(isSplit) =>
        isSplit ? (
          <form.Field name="type">
            {(typeField) => (
              <form.Field name="lines" mode="array">
                {(linesField) => {
                  const typeCategories = categories.filter((c) => c.type === typeField.state.value);
                  return (
                    <div className="space-y-3 md:col-span-6">
                      <FieldError message={linesField.state.meta.errors[0]?.message} />
                      {linesField.state.value.map((_, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]">
                          <form.Field name={`lines[${index}].categoryId`}>
                            {(field) => (
                              <Select
                                aria-label={t("transactions.lineCategory")}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              >
                                <option value="">{t("transactions.uncategorized")}</option>
                                {typeCategories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </form.Field>
                          <form.Field name={`lines[${index}].amount`}>
                            {(field) => (
                              <Input
                                aria-label={t("transactions.lineAmount")}
                                inputMode="decimal"
                                placeholder="0.00"
                                value={field.state.value}
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
                                value={field.state.value}
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
                            onClick={() => linesField.removeValue(index)}
                          >
                            <X />
                          </Button>
                        </div>
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
                  );
                }}
              </form.Field>
            )}
          </form.Field>
        ) : null
      }
    </form.Subscribe>
  );
}
