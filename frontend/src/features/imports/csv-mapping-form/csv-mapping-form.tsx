import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateCsvMapping, useUpdateCsvMapping } from "@/api/generated";
import {
  CsvAmountStyle,
  CsvDecimalSeparator,
  CsvEncoding,
  type CsvMappingResponse,
  type InspectCsvResponse,
} from "@/api/generated/model";
import { createCsvMappingBodyNameMax } from "@/api/schemas/imports/imports.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import type { SelectOption } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import {
  ScrollRegion,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useCurrencyName, useUsableCurrencies } from "@/hooks/use-formatters";
import { silent, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { requiredText } from "@/lib/validation";
import {
  type ColumnRole,
  columnsSchema,
  DATE_FORMATS,
  DELIMITER_NAMES,
  DELIMITERS,
  type MappingSource,
  dateFormatsFor,
  draftOf,
  missingColumns,
  sourceOf,
  toRequest,
} from "./csv-mapping";

const SAMPLE_ROWS = 5;
const MAX_SKIP_LINES = 20;
const optionalRoles = ["description", "payee", "reference", "balance"] as const;
const noMappings: CsvMappingResponse[] = [];

export interface ReadOptions {
  encoding: CsvEncoding;
  delimiter: string;
  skipLines: number;
}

interface Props {
  inspection?: InspectCsvResponse;
  initial?: CsvMappingResponse;
  fitting?: CsvMappingResponse[];
  readPending?: boolean;
  onRead?: (options: ReadOptions) => void;
  onUse?: (mapping: CsvMappingResponse) => void;
  onSaved: (mapping: CsvMappingResponse) => void;
  onCancel: () => void;
}

function FormSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <fieldset className="space-y-3 border-t border-rule pt-4 *:clear-both">
      <legend className="float-left -mt-1 mb-2 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function columnOptions(source: MappingSource, blank?: string): SelectOption[] {
  const options = source.columns.map((column, index) => {
    const examples = source.samples
      .map((row) => row[index]?.trim())
      .filter(Boolean)
      .slice(0, 2);
    return {
      value: column.name,
      label: examples.length ? `${column.name} · ${examples.join(", ")}` : column.name,
    };
  });
  return blank === undefined ? options : [{ value: "", label: blank }, ...options];
}

export function CsvMappingForm({
  inspection,
  initial,
  fitting = noMappings,
  readPending = false,
  onRead,
  onUse,
  onSaved,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();
  const currencies = useUsableCurrencies();
  const source = sourceOf(inspection, initial);
  const none = t("imports.mapping.none");
  const required = t("imports.mapping.required");

  const { create, update, pending, error } = upsert(
    useCreateCsvMapping(silent({ onSuccess: onSaved })),
    useUpdateCsvMapping(silent({ onSuccess: onSaved })),
  );

  const schema = z
    .object({
      name: requiredText(t, createCsvMappingBodyNameMax),
      encoding: z.enum(CsvEncoding),
      delimiter: z.string(),
      skipLines: z.string(),
      amountStyle: z.enum(CsvAmountStyle),
      dateFormat: z.string(),
      decimalSeparator: z.enum(CsvDecimalSeparator),
      currency: z.string(),
      columns: columnsSchema,
    })
    .superRefine((value, ctx) => {
      for (const role of missingColumns(value)) {
        ctx.addIssue({ code: "custom", message: required, path: ["columns", role] });
      }
    });

  const form = useServerForm({
    defaultValues: draftOf(source, initial),
    schema,
    submit: (value) => {
      const data = toRequest(value);
      return initial ? update({ id: initial.id, data }) : create({ data });
    },
  });

  function reread() {
    onRead?.({
      encoding: form.getFieldValue("encoding"),
      delimiter: form.getFieldValue("delimiter"),
      skipLines: Number(form.getFieldValue("skipLines")),
    });
  }

  function columnField(role: ColumnRole, label: string, hint?: string) {
    return (
      <form.Field name={`columns.${role}`}>
        {(field) => (
          <field.SelectFieldControl
            id={`csv-column-${role}`}
            label={label}
            hint={hint}
            options={columnOptions(source, role === "date" ? undefined : none)}
            placeholder={none}
            onValueChange={
              role === "date"
                ? (column) => {
                    const proposed = dateFormatsFor(source, column)[0];
                    if (proposed) {
                      form.setFieldValue("dateFormat", proposed);
                    }
                  }
                : undefined
            }
          />
        )}
      </form.Field>
    );
  }

  const fits = fitting.filter((mapping) => mapping.id !== initial?.id);

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        {fits.length > 0 && onUse ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
            <span>{t("imports.mapping.fits")}</span>
            {fits.map((mapping) => (
              <Button
                key={mapping.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onUse(mapping)}
              >
                {t("imports.mapping.use", { name: mapping.name })}
              </Button>
            ))}
          </div>
        ) : null}

        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="csv-mapping-name"
              label={t("imports.mapping.name")}
              placeholder={t("imports.mapping.namePlaceholder")}
              hint={t("imports.mapping.nameHint")}
            />
          )}
        </form.Field>

        <FormSection title={t("imports.mapping.reading")}>
          <FormGrid>
            <form.Field name="encoding">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-encoding"
                  label={t("imports.mapping.encoding")}
                  options={optionsOf(Object.values(CsvEncoding), (encoding) =>
                    t(`imports.mapping.encodings.${encoding}`),
                  )}
                  disabled={readPending}
                  onValueChange={reread}
                />
              )}
            </form.Field>
            <form.Field name="delimiter">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-delimiter"
                  label={t("imports.mapping.delimiter")}
                  options={DELIMITER_NAMES.map((name) => ({
                    value: DELIMITERS[name],
                    label: t(`imports.mapping.delimiters.${name}`),
                  }))}
                  disabled={readPending}
                  onValueChange={reread}
                />
              )}
            </form.Field>
            <form.Field name="skipLines">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-skip-lines"
                  label={t("imports.mapping.skipLines")}
                  options={Array.from({ length: MAX_SKIP_LINES + 1 }, (_, lines) => ({
                    value: String(lines),
                    label: String(lines),
                  }))}
                  disabled={readPending}
                  onValueChange={reread}
                />
              )}
            </form.Field>
          </FormGrid>
          {onRead ? (
            <p className="text-sm text-muted-foreground">{t("imports.mapping.readingHint")}</p>
          ) : null}
        </FormSection>

        <FormSection title={t("imports.mapping.money")}>
          <form.Field name="amountStyle">
            {(field) => (
              <field.SelectFieldControl
                id="csv-amount-style"
                kind="segments"
                label={t("imports.mapping.amountStyle")}
                hint={t(`imports.mapping.styles.${field.value}.example`)}
                options={optionsOf(Object.values(CsvAmountStyle), (style) =>
                  t(`imports.mapping.styles.${style}.label`),
                )}
              />
            )}
          </form.Field>
          <FormGrid>
            <form.Subscribe selector={(state) => state.values.amountStyle}>
              {(style) => (
                <>
                  {style === "debitCredit"
                    ? null
                    : columnField("amount", t("imports.mapping.amount"))}
                  {style === "debitCredit" ? (
                    <>
                      {columnField("debit", t("imports.mapping.debit"))}
                      {columnField("credit", t("imports.mapping.credit"))}
                    </>
                  ) : null}
                  {style === "amountWithDirection" ? (
                    <>
                      {columnField("direction", t("imports.mapping.direction"))}
                      <form.Field name="columns.expenseValue">
                        {(field) => (
                          <field.TextField
                            id="csv-expense-value"
                            label={t("imports.mapping.expenseValue")}
                            placeholder={t("imports.mapping.expenseValuePlaceholder")}
                          />
                        )}
                      </form.Field>
                    </>
                  ) : null}
                </>
              )}
            </form.Subscribe>
            <form.Field name="decimalSeparator">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-decimal-separator"
                  label={t("imports.mapping.decimalSeparator")}
                  options={optionsOf(Object.values(CsvDecimalSeparator), (separator) =>
                    t(`imports.mapping.separators.${separator}`),
                  )}
                />
              )}
            </form.Field>
            {columnField("fee", t("imports.mapping.fee"), t("imports.mapping.feeHint"))}
          </FormGrid>
        </FormSection>

        <FormSection title={t("imports.mapping.columns")}>
          <FormGrid>
            {columnField("date", t("imports.mapping.date"))}
            <form.Subscribe selector={(state) => state.values.columns.date}>
              {(dateColumn) => {
                const proposed = dateFormatsFor(source, dateColumn);
                return (
                  <form.Field name="dateFormat">
                    {(field) => (
                      <field.SelectFieldControl
                        id="csv-date-format"
                        label={t("imports.mapping.dateFormat")}
                        hint={proposed.length > 1 ? t("imports.mapping.ambiguous") : undefined}
                        options={[
                          ...proposed.map((format) => ({
                            value: format,
                            label: format,
                            group: t("imports.mapping.proposed"),
                          })),
                          ...DATE_FORMATS.filter((format) => !proposed.includes(format)).map(
                            (format) => ({
                              value: format,
                              label: format,
                              group: proposed.length
                                ? t("imports.mapping.otherFormats")
                                : undefined,
                            }),
                          ),
                        ]}
                      />
                    )}
                  </form.Field>
                );
              }}
            </form.Subscribe>
            {optionalRoles.map((role) => (
              <Fragment key={role}>{columnField(role, t(`imports.mapping.${role}`))}</Fragment>
            ))}
            {columnField("currency", t("imports.mapping.currencyColumn"))}
            <form.Subscribe selector={(state) => state.values.columns.currency}>
              {(currencyColumn) =>
                currencyColumn ? null : (
                  <form.Field name="currency">
                    {(field) => (
                      <field.SelectFieldControl
                        id="csv-currency"
                        label={t("imports.mapping.currency")}
                        options={[
                          { value: "", label: t("imports.mapping.accountCurrency") },
                          ...currencies.map((currency) => ({
                            value: currency,
                            label: `${currency.toUpperCase()} · ${currencyName(currency)}`,
                          })),
                        ]}
                      />
                    )}
                  </form.Field>
                )
              }
            </form.Subscribe>
            {columnField("status", t("imports.mapping.status"), t("imports.mapping.statusHint"))}
            <form.Subscribe selector={(state) => state.values.columns.status}>
              {(statusColumn) =>
                statusColumn ? (
                  <form.Field name="columns.bookedValues">
                    {(field) => (
                      <field.TextField
                        id="csv-booked-values"
                        label={t("imports.mapping.bookedValues")}
                        hint={t("imports.mapping.bookedValuesHint")}
                      />
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>
          </FormGrid>
          {initial ? (
            <form.Subscribe selector={(state) => state.values.columns.reference}>
              {(reference) =>
                reference ? null : (
                  <p className="max-w-prose text-sm text-muted-foreground">
                    {t("imports.mapping.referenceHint")}
                  </p>
                )
              }
            </form.Subscribe>
          ) : null}
        </FormSection>

        {source.samples.length > 0 ? (
          <FormSection title={t("imports.mapping.samples")}>
            <ScrollRegion aria-label={t("imports.mapping.samples")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {source.columns.map((column) => (
                      <TableHead key={column.name}>{column.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {source.samples.slice(0, SAMPLE_ROWS).map((row) => (
                    <TableRow key={row.join("|")}>
                      {source.columns.map((column, index) => (
                        <TableCell key={column.name} className="whitespace-nowrap">
                          {row[index]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollRegion>
          </FormSection>
        ) : null}

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          disabled={readPending}
          submitLabel={t(inspection ? "imports.mapping.saveAndPreview" : "actions.save")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
