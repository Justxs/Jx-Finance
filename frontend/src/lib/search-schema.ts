import { z } from "zod";
import { SortDirection } from "@/api/generated/model";

export function optionalParam<TSchema extends z.ZodType>(schema: TSchema) {
  return schema.optional().catch(undefined);
}

export function sortParams<const TFields extends Readonly<Record<string, string>>>(
  fields: TFields,
) {
  return {
    sort: optionalParam(z.enum(fields)),
    direction: optionalParam(z.enum(SortDirection)),
  };
}

export const emailTokenSearchSchema = z.object({
  email: optionalParam(z.string()),
  token: optionalParam(z.string()),
});
