import { z } from "zod";
import { FlowType } from "@/api/generated/model";
import { optionalParam } from "./search-schema";

export const transactionFilterSchema = z.object({
  search: optionalParam(z.string()),
  payee: optionalParam(z.string()),
  place: optionalParam(z.string()),
  accountId: optionalParam(z.uuid()),
  categoryId: optionalParam(z.uuid()),
  tagIds: optionalParam(
    z.string().refine((value) => value.split(",").every((id) => z.uuid().safeParse(id).success)),
  ),
  type: optionalParam(z.enum(FlowType)),
  dateFrom: optionalParam(z.iso.date()),
  dateTo: optionalParam(z.iso.date()),
  amountMin: optionalParam(z.number().nonnegative()),
  amountMax: optionalParam(z.number().nonnegative()),
  unusual: optionalParam(z.literal(true)),
  uncategorized: optionalParam(z.literal(true)),
  duplicates: optionalParam(z.literal(true)),
  spreadOverlap: optionalParam(z.literal(true)),
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
