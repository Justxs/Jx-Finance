import type { StandardSchemaV1 } from "@tanstack/react-form";
import { type FieldAliases, submitToServer } from "@/lib/form-server-errors";
import { useAppForm } from "./app-form";

interface Options<TFormData> {
  defaultValues: TFormData;
  schema: StandardSchemaV1<TFormData, unknown>;
  aliases?: FieldAliases;
  submit: (value: TFormData) => Promise<unknown> | void;
}

export function useServerForm<TFormData>({
  defaultValues,
  schema,
  aliases,
  submit,
}: Options<TFormData>) {
  return useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => submitToServer(submission, () => submit(submission.value), aliases),
  });
}
