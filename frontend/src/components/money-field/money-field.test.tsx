import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import type { CurrenciesResponse } from "@/api/generated/model";
import { createQueryWrapper } from "@/test/query";
import { MoneyField } from "./money-field";

const multiCurrency: CurrenciesResponse = {
  reportingCurrency: "eur",
  currencies: ["eur", "usd"],
  ratesAsOf: null,
};

function renderField(
  props: Partial<ComponentProps<typeof MoneyField>> = {},
  currencies: CurrenciesResponse = multiCurrency,
) {
  const onChange = vi.fn();
  render(
    <MoneyField
      id="amount"
      label="Amount"
      value=""
      onChange={onChange}
      currency="eur"
      onCurrencyChange={vi.fn()}
      currencyLabel="Currency"
      {...props}
    />,
    { wrapper: createQueryWrapper({ currencies }).Wrapper },
  );
  return { onChange, input: screen.getByLabelText("Amount") };
}

test("is a labelled decimal input that reports typing", async () => {
  const { onChange, input } = renderField();

  expect(input).toHaveAttribute("inputmode", "decimal");
  expect(input).toHaveAttribute("placeholder", "0.00");
  expect(input).not.toBeInvalid();
  expect(input).not.toHaveAttribute("aria-describedby");

  await userEvent.type(input, "5");

  expect(onChange).toHaveBeenCalledExactlyOnceWith("5");
});

test("an error marks the input invalid and describes it", () => {
  const { input } = renderField({ error: "Amount is required." });

  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription("Amount is required.");
});

test("hint and error both describe the input, hint first", () => {
  const { input } = renderField({ hint: "In account currency.", error: "Too large." });

  expect(input).toHaveAttribute("aria-describedby", "amount-hint amount-error");
  expect(input).toHaveAccessibleDescription("In account currency. Too large.");
});

test("offers a currency picker when several currencies are usable", () => {
  renderField({ currencyError: "Pick a currency." });
  const picker = screen.getByRole("combobox", { name: "Currency" });

  expect(picker).toHaveTextContent("EUR");
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
