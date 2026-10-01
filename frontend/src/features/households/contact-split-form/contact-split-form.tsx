import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  useContactsSuspense,
  useCreateContactSplit,
  useMeSuspense,
  useUpdateContactSplit,
} from "@/api/generated";
import { SplitMethod, type TransactionResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { MAX_WEIGHT, allocateShares, isWeight } from "@/features/households/share-allocation";
import { useMoney } from "@/hooks/use-formatters";
import { silentMutation, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import { userName } from "@/lib/user-name";
import { isNonNegativeMoney, normalizeMoney } from "@/lib/validation";

const methods = Object.values(SplitMethod);
const YOU = "";

interface PersonValue {
  id: string;
  name: string;
  included: boolean;
  weight: string;
  amount: string;
}

interface Props {
  transaction: TransactionResponse;
  onClose: () => void;
}

export function ContactSplitForm({ transaction, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const me = useMeSuspense().data;
  const contacts = useContactsSuspense().data;
  const existing = transaction.contactSplit ?? null;
  const { create, update, pending, error } = upsert(
    useCreateContactSplit({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateContactSplit({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const people: PersonValue[] = [
    {
      id: YOU,
      name: userName(me),
      included: existing ? existing.ownAmount !== null : true,
      weight: String(existing?.ownWeight ?? 1),
      amount: existing?.method === "exact" ? (existing.ownAmount ?? "") : "",
    },
    ...contacts.map((contact) => {
      const share = existing?.shares.find((item) => item.contactId === contact.id);
      return {
        id: contact.id,
        name: contact.name,
        included: share !== undefined,
        weight: String(share?.weight ?? 1),
        amount: existing?.method === "exact" && share ? share.amount : "",
      };
    }),
  ];

  const schema = z
    .object({
      method: z.enum(SplitMethod),
      people: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          included: z.boolean(),
          weight: z.string(),
          amount: z.string(),
        }),
      ),
    })
    .superRefine((value, ctx) => {
      if (!value.people.some((person) => person.included && person.id !== YOU)) {
        ctx.addIssue({
          code: "custom",
          message: t("households.people.split.nobody"),
          path: ["people"],
        });
      }
      for (const [index, person] of value.people.entries()) {
        if (!person.included) {
          continue;
        }
        if (value.method === "shares" && !isWeight(person.weight)) {
          ctx.addIssue({
            code: "custom",
            message: t("validation.wholeNumberBetween", { min: 1, max: MAX_WEIGHT }),
            path: ["people", index, "weight"],
          });
        }
        if (value.method === "exact" && !isNonNegativeMoney(person.amount)) {
          ctx.addIssue({
            code: "custom",
            message: t("validation.money"),
            path: ["people", index, "amount"],
          });
        }
      }
    });

  const form = useServerForm({
    defaultValues: { method: existing?.method ?? SplitMethod.equal, people },
    schema,
    submit: (value) => {
      function partOf(person: PersonValue) {
        return {
          weight: value.method === "shares" ? Number(person.weight) : null,
          amount: value.method === "exact" ? normalizeMoney(person.amount) : null,
        };
      }
      const you = value.people.find((person) => person.id === YOU && person.included);
      const data = {
        method: value.method,
        own: you ? partOf(you) : null,
        shares: value.people
          .filter((person) => person.included && person.id !== YOU)
          .map((person) => ({ contactId: person.id, ...partOf(person) })),
      };
      return existing
        ? update({ id: existing.id, data })
        : create({ data: { transactionId: transaction.id, ...data } });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="method">
          {(field) => (
            <field.SelectFieldControl
              id="contact-split-method"
              kind="segments"
              label={t("households.split.method")}
              className="col-span-full"
              options={optionsOf(methods, (method) => t(`households.split.methods.${method}`))}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const included = values.people.filter((person) => person.included);
            const cents = allocateShares(
              transaction.amount,
              values.method,
              included.map((person) => ({ weight: Number(person.weight), amount: person.amount })),
            );
            const assigned = included.reduce(
              (total, person) =>
                total +
                (isNonNegativeMoney(person.amount) ? Number(normalizeMoney(person.amount)) : 0),
              0,
            );

            return (
              <fieldset className="col-span-full space-y-3">
                <legend className="mb-2 text-sm font-medium">
                  {t("households.split.members")}
                </legend>
                <p className="text-sm text-muted-foreground">{t("households.people.split.hint")}</p>
                <form.Field name="people">
                  {(field) => <FieldError message={field.errors[0]?.message} />}
                </form.Field>
                {values.people.map((person, index) => {
                  const share = cents?.[included.indexOf(person)];
                  return (
                    <div
                      key={person.id}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
                    >
                      <form.Field name={`people[${index}].included`}>
                        {(field) => (
                          <field.CheckboxField
                            id={`contact-split-person-${index}`}
                            label={t("households.split.include", { name: person.name })}
                            hint={
                              person.included && share !== undefined
                                ? t("households.split.preview", {
                                    name: person.name,
                                    amount: money.format(share / 100, transaction.currency),
                                  })
                                : undefined
                            }
                          />
                        )}
                      </form.Field>
                      {person.included && values.method === "shares" ? (
                        <form.Field name={`people[${index}].weight`}>
                          {(field) => (
                            <field.TextField
                              id={`contact-split-person-${index}-weight`}
                              inputMode="numeric"
                              aria-label={t("households.split.weight", { name: person.name })}
                            />
                          )}
                        </form.Field>
                      ) : null}
                      {person.included && values.method === "exact" ? (
                        <form.Field name={`people[${index}].amount`}>
                          {(field) => (
                            <field.MoneyInputField
                              id={`contact-split-person-${index}-amount`}
                              aria-label={t("households.split.amount", { name: person.name })}
                            />
                          )}
                        </form.Field>
                      ) : null}
                    </div>
                  );
                })}
                {values.method === "exact" && included.length > 0 && cents === null ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {t("households.split.mismatch", {
                      assigned: money.format(assigned, transaction.currency),
                      total: money.format(Number(transaction.amount), transaction.currency),
                    })}
                  </p>
                ) : null}
              </fieldset>
            );
          }}
        </form.Subscribe>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
