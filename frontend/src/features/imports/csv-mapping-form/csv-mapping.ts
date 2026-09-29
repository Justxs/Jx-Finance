import { z } from "zod";
import {
  type CreateCsvMappingRequest,
  type CsvAmountStyle,
  type CsvDecimalSeparator,
  type CsvEncoding,
  type CsvMappingResponse,
  Currency,
  type InspectCsvColumn,
  type InspectCsvResponse,
} from "@/api/generated/model";

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

export const DELIMITERS = { comma: ",", semicolon: ";", tab: "\t", pipe: "|" } as const;

export const DELIMITER_NAMES = ["comma", "semicolon", "tab", "pipe"] as const;

export const COLUMN_ROLES = [
  "date",
  "description",
  "payee",
  "amount",
  "debit",
  "credit",
  "direction",
  "currency",
  "reference",
  "balance",
  "fee",
  "status",
] as const;

export const columnsSchema = z.object({
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

export type ColumnRole = (typeof COLUMN_ROLES)[number];

export type MappingColumns = z.infer<typeof columnsSchema>;

export interface MappingValues {
  name: string;
  encoding: CsvEncoding;
  delimiter: string;
  skipLines: string;
  amountStyle: CsvAmountStyle;
  dateFormat: string;
  decimalSeparator: CsvDecimalSeparator;
  currency: string;
  columns: MappingColumns;
}

export interface MappingSource {
  encoding: CsvEncoding;
  delimiter: string;
  skipLines: number;
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
  const names = COLUMN_ROLES.map((role) => initial?.columns[role]).filter((name): name is string =>
    Boolean(name),
  );
  return {
    encoding: initial?.encoding ?? "utf8",
    delimiter: initial?.delimiter ?? ",",
    skipLines: initial?.skipLines ?? 0,
    columns: [...new Set(names)].map((name) => ({ name, dateFormats: [], decimalSeparator: null })),
    samples: [],
  };
}

export function draftOf(
  source: MappingSource,
  initial: CsvMappingResponse | undefined,
): MappingValues {
  const date = source.columns.find((column) => column.dateFormats.length > 0);
  const amount = source.columns.find((column) => column.decimalSeparator !== null);
  const columns = columnsSchema.parse(
    Object.fromEntries(
      columnsSchema.keyof().options.map((role) => [role, initial?.columns[role] ?? ""]),
    ),
  );

  return {
    name: initial?.name ?? "",
    encoding: source.encoding,
    delimiter: source.delimiter,
    skipLines: String(source.skipLines),
    amountStyle: initial?.amountStyle ?? "signedNegativeIsExpense",
    dateFormat: initial?.dateFormat ?? date?.dateFormats[0] ?? DATE_FORMATS[0],
    decimalSeparator: initial?.decimalSeparator ?? amount?.decimalSeparator ?? "dot",
    currency: initial?.currency ?? "",
    columns: initial ? columns : { ...columns, date: date?.name ?? "", amount: amount?.name ?? "" },
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
