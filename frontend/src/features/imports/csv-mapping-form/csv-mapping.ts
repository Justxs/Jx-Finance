import { z } from "zod";
import {
  type CreateCsvMappingRequest,
  CsvAmountStyle,
  CsvDecimalSeparator,
  CsvEncoding,
  type CsvMappingResponse,
  Currency,
  type InspectCsvColumn,
  type InspectCsvResponse,
} from "@/api/generated/model";
import { createCsvMappingBodyNameMax } from "@/api/schemas/imports/imports.zod";
import type { Translate } from "@/lib/i18n";
import { requiredText } from "@/lib/validation";

export const DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd.MM.yyyy",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "yyyy.MM.dd",
  "yyyy/MM/dd",
  "d.M.yyyy",
] as const;

const columnsSchema = z.object({
  date: z.string(),
  description: z.string(),
  payee: z.string(),
  amount: z.string(),
  debit: z.string(),
  credit: z.string(),
  direction: z.string(),
  expenseValue: z.string(),
  currency: z.string(),
  reference: z.string(),
  balance: z.string(),
  fee: z.string(),
  status: z.string(),
  bookedValues: z.string(),
});

const VALUE_FIELDS: ReadonlySet<string> = new Set(["expenseValue", "bookedValues"]);

const mappingFields = z.object({
  name: z.string(),
  encoding: z.enum(CsvEncoding),
  delimiter: z.string(),
  skipLines: z.string(),
  noHeaderRow: z.boolean(),
  amountStyle: z.enum(CsvAmountStyle),
  dateFormat: z.string(),
  decimalSeparator: z.enum(CsvDecimalSeparator),
  currency: z.string(),
  columns: columnsSchema,
});

export type MappingColumns = z.infer<typeof columnsSchema>;

type MappingValues = z.infer<typeof mappingFields>;

export function mappingSchema(t: Translate) {
  return mappingFields
    .extend({ name: requiredText(t, createCsvMappingBodyNameMax) })
    .superRefine((value, ctx) => {
      for (const role of missingColumns(value)) {
        ctx.addIssue({
          code: "custom",
          message: t("imports.mapping.required"),
          path: ["columns", role],
        });
      }
    });
}

export interface MappingSource {
  encoding: CsvEncoding;
  delimiter: string;
  skipLines: number;
  noHeaderRow: boolean;
  columns: InspectCsvColumn[];
  samples: string[][];
}

const requiredByStyle: Record<CsvAmountStyle, (keyof MappingColumns)[]> = {
  signedNegativeIsExpense: ["amount"],
  signedPositiveIsExpense: ["amount"],
  debitCredit: ["debit", "credit"],
  amountWithDirection: ["amount", "direction", "expenseValue"],
};

export function sourceOf(
  inspection: InspectCsvResponse | undefined,
  initial: CsvMappingResponse | undefined,
): MappingSource {
  if (inspection) {
    return inspection;
  }
  const names = columnsSchema
    .keyof()
    .options.filter((role) => !VALUE_FIELDS.has(role))
    .map((role) => initial?.columns[role])
    .filter((name): name is string => Boolean(name));
  return {
    encoding: initial?.encoding ?? "utf8",
    delimiter: initial?.delimiter ?? ",",
    skipLines: initial?.skipLines ?? 0,
    noHeaderRow: initial?.noHeaderRow ?? false,
    columns: [...new Set(names)].map((name) => ({ name, dateFormats: [], decimalSeparator: null })),
    samples: [],
  };
}

export function draftOf(
  source: MappingSource,
  initial: CsvMappingResponse | undefined,
  amountStyle: CsvAmountStyle = "signedNegativeIsExpense",
): MappingValues {
  const date = source.columns.find((column) => column.dateFormats.length > 0);
  const amount = source.columns.find((column) => column.decimalSeparator !== null);
  const kept = initial?.noHeaderRow === source.noHeaderRow ? initial : undefined;
  const columns = columnsSchema.parse(
    Object.fromEntries(
      columnsSchema.keyof().options.map((role) => [role, kept?.columns[role] ?? ""]),
    ),
  );

  return {
    name: initial?.name ?? "",
    encoding: source.encoding,
    delimiter: source.delimiter,
    skipLines: String(source.skipLines),
    noHeaderRow: source.noHeaderRow,
    amountStyle: initial?.amountStyle ?? amountStyle,
    dateFormat: initial?.dateFormat ?? date?.dateFormats[0] ?? DATE_FORMATS[0],
    decimalSeparator: initial?.decimalSeparator ?? amount?.decimalSeparator ?? "dot",
    currency: initial?.currency ?? "",
    columns: kept ? columns : { ...columns, date: date?.name ?? "", amount: amount?.name ?? "" },
  };
}

export function missingColumns(values: MappingValues): (keyof MappingColumns)[] {
  const wanted: (keyof MappingColumns)[] = ["date", ...requiredByStyle[values.amountStyle]];
  if (values.columns.status) {
    wanted.push("bookedValues");
  }
  return wanted.filter((role) => values.columns[role].trim() === "");
}

export function toRequest(values: MappingValues): CreateCsvMappingRequest {
  const used = new Set<keyof MappingColumns>([
    "date",
    "description",
    "payee",
    "currency",
    "reference",
    "balance",
    "fee",
    "status",
    ...requiredByStyle[values.amountStyle],
    ...(values.columns.status ? (["bookedValues"] as const) : []),
  ]);
  function pick(role: keyof MappingColumns) {
    const name = values.columns[role].trim();
    return used.has(role) && name ? name : null;
  }

  return {
    name: values.name.trim(),
    encoding: values.encoding,
    delimiter: values.delimiter,
    skipLines: Number(values.skipLines),
    noHeaderRow: values.noHeaderRow,
    amountStyle: values.amountStyle,
    dateFormat: values.dateFormat,
    decimalSeparator: values.decimalSeparator,
    currency: values.columns.currency
      ? null
      : (Object.values(Currency).find((currency) => currency === values.currency) ?? null),
    columns: {
      date: values.columns.date.trim(),
      description: pick("description"),
      payee: pick("payee"),
      amount: pick("amount"),
      debit: pick("debit"),
      credit: pick("credit"),
      direction: pick("direction"),
      expenseValue: pick("expenseValue"),
      currency: pick("currency"),
      reference: pick("reference"),
      balance: pick("balance"),
      fee: pick("fee"),
      status: pick("status"),
      bookedValues: pick("bookedValues"),
    },
  };
}

export function dateFormatsFor(source: MappingSource, column: string): string[] {
  return source.columns.find((item) => item.name === column)?.dateFormats ?? [];
}
