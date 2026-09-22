import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { z } from "zod";
import { type CurrenciesResponse, Currency } from "@/api/generated/model";
import { renderWithQuery } from "@/test/query";
import { useAppForm } from "../app-form";

const multiCurrency: CurrenciesResponse = {
  reportingCurrency: "eur",
  currencies: ["eur", "usd"],
  ratesAsOf: null,
};

interface Values {
  amount: string;
  currency: Currency;
}

interface HarnessProps {
  hint?: string;
  disabled?: boolean;
}

function Harness({ hint, disabled }: Readonly<HarnessProps>) {
  const defaultValues: Values = { amount: "", currency: "eur" };
  const form = useAppForm({
    defaultValues,
    validators: [
      {
        run: z.object({
          amount: z.string().refine((value) => value !== "abc", "Too large."),
          currency: z.enum(Currency).refine((value) => value !== "usd", "Pick a currency."),
        }),
        triggers: ["change"],
      },
    ],
  });

  return (
    <form.Field name="currency">
      {(currencyField) => (
        <form.Field name="amount">
          {(field) => (
            <field.MoneyAmountField
              id="amount"
              label="Amount"
              currencyLabel="Currency"
              currencyField={currencyField}
              hint={hint}
              disabled={disabled}
            />
          )}
        </form.Field>
      )}
    </form.Field>
  );
}

function renderField(props: HarnessProps = {}, currencies: CurrenciesResponse = multiCurrency) {
  renderWithQuery(<Harness {...props} />, { currencies });
  return { input: screen.getByLabelText("Amount") };
}

test("is a labelled decimal input that reports typing", async () => {
  const { input } = renderField();

  expect(input).toHaveAttribute("inputmode", "decimal");
  expect(input).toHaveAttribute("placeholder", "0.00");
  expect(input).not.toBeInvalid();
  expect(input).not.toHaveAttribute("aria-describedby");

  await userEvent.type(input, "5");

  expect(input).toHaveValue("5");
});

test("an error marks the input invalid and describes it", async () => {
  const { input } = renderField();

  await userEvent.type(input, "abc");

  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription("Too large.");
});

test("hint and error both describe the input, hint first", async () => {
  const { input } = renderField({ hint: "In account currency." });

  await userEvent.type(input, "abc");

  expect(input).toHaveAttribute("aria-describedby", "amount-hint amount-error");
  expect(input).toHaveAccessibleDescription("In account currency. Too large.");
});

test("a currency error describes the picker", async () => {
  renderField();
  const picker = screen.getByRole("combobox", { name: "Currency" });

  expect(picker).toHaveTextContent("EUR");
  expect(picker).not.toHaveAttribute("aria-describedby");

  await userEvent.click(picker);
  await userEvent.click(await screen.findByRole("option", { name: /USD/u }));

  expect(picker).toHaveAttribute("aria-describedby", "amount-currency-error");
  expect(screen.getByText("Pick a currency.")).toBeInTheDocument();
});

test("hides the currency picker on a single-currency instance", () => {
  renderField({}, { ...multiCurrency, currencies: ["eur"] });

  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

test("can be disabled", () => {
  expect(renderField({ disabled: true }).input).toBeDisabled();
});
