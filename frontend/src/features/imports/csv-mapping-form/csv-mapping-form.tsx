import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { useCreateCsvMapping, useUpdateCsvMapping } from "@/api/generated";
import {
  CsvAmountStyle,
  CsvDecimalSeparator,
  CsvEncoding,
  type CsvMappingResponse,
  type InspectCsvResponse,
} from "@/api/generated/model";
import { createCsvMappingBodySkipLinesMax } from "@/api/schemas/imports/imports.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormSection } from "@/components/form/form-section/form-section";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useUsableCurrencies } from "@/hooks/use-currencies";
import { useCurrencyName } from "@/hooks/use-formatters";
import { silentMutation, upsert } from "@/lib/mutations";
import { optionsOf, type SelectOption } from "@/lib/options";
import {
  DATE_FORMATS,
  type MappingColumns,
  type MappingSource,
  dateFormatsFor,
  draftOf,
  mappingSchema,
  sourceOf,
  toRequest,
} from "./csv-mapping";

const SAMPLE_ROWS = 5;
const DELIMITERS = [
  ["comma", ","],
  ["semicolon", ";"],
  ["tab", "\t"],
  ["pipe", "|"],
] as const;
const optionalRoles = ["description", "payee", "reference", "balance"] as const;
const noMappings: CsvMappingResponse[] = [];

export interface ReadOptions {
  encoding: CsvEncoding;
  delimiter: string;
  skipLines: number;
  noHeaderRow: boolean;
}

interface Props {
  inspection?: InspectCsvResponse;
  initial?: CsvMappingResponse;
  fitting?: CsvMappingResponse[];
  cardAccount?: boolean;
  readPending?: boolean;
  onRead?: (options: ReadOptions) => void;
  onUse?: (mapping: CsvMappingResponse) => void;
  onSaved: (mapping: CsvMappingResponse) => void;
  onCancel: () => void;
}

function columnOptions(
  source: MappingSource,
  title: (name: string) => string,
  blank?: string,
): SelectOption[] {
  const options = source.columns.map((column, index) => {
    const examples = source.samples
      .map((row) => row[index]?.trim())
      .filter(Boolean)
      .slice(0, 2);
    const name = title(column.name);
    return {
      value: column.name,
      label: examples.length ? `${name} · ${examples.join(", ")}` : name,
    };
  });
  return blank === undefined ? options : [{ value: "", label: blank }, ...options];
}

export function CsvMappingForm({
  inspection,
  initial,
  fitting = noMappings,
  cardAccount = false,
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

  function columnTitle(name: string) {
    return source.noHeaderRow ? t("imports.mapping.position", { position: name }) : name;
  }

  const { create, update, pending, error } = upsert(
    useCreateCsvMapping({ mutation: { ...silentMutation, onSuccess: onSaved } }),
    useUpdateCsvMapping({ mutation: { ...silentMutation, onSuccess: onSaved } }),
  );

  const form = useServerForm({
    defaultValues: draftOf(
      source,
      initial,
      cardAccount ? "signedPositiveIsExpense" : "signedNegativeIsExpense",
    ),
    schema: mappingSchema(t),
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
      noHeaderRow: form.getFieldValue("noHeaderRow"),
    });
  }

  function columnField(role: keyof MappingColumns, label: string, hint?: string) {
    return (
      <form.Field name={`columns.${role}`}>
        {(field) => (
          <field.SelectFieldControl
            id={`csv-column-${role}`}
            label={label}
            hint={hint}
            options={columnOptions(source, columnTitle, role === "date" ? undefined : none)}
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
          <div className="flex flex-wrap items-center gap-2 border-b pb-3 text-sm">
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
                  onValueChange={reread}
                />
              )}
            </form.Field>
            <form.Field name="delimiter">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-delimiter"
                  label={t("imports.mapping.delimiter")}
                  options={DELIMITERS.map(([name, value]) => ({
                    value,
                    label: t(`imports.mapping.delimiters.${name}`),
                  }))}
                  onValueChange={reread}
                />
              )}
            </form.Field>
            <form.Field name="skipLines">
              {(field) => (
                <field.SelectFieldControl
                  id="csv-skip-lines"
                  label={t("imports.mapping.skipLines")}
                  options={Array.from(
                    { length: createCsvMappingBodySkipLinesMax + 1 },
                    (_, lines) => ({
                      value: String(lines),
                      label: String(lines),
                    }),
                  )}
                  onValueChange={reread}
                />
              )}
            </form.Field>
          </FormGrid>
          <form.Field name="noHeaderRow">
            {(field) => (
              <field.CheckboxField
                id="csv-no-header-row"
                label={t("imports.mapping.noHeaderRow")}
                hint={t("imports.mapping.noHeaderRowHint")}
                disabled={!onRead}
                onCheckedChange={reread}
              />
            )}
          </form.Field>
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
            <Table label={t("imports.mapping.samples")}>
              <TableHeader>
                <TableRow>
                  {source.columns.map((column) => (
                    <TableHead key={column.name}>{columnTitle(column.name)}</TableHead>
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
