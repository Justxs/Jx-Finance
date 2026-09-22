import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { CurrenciesResponse, Currency } from "@/api/generated/model";
import { renderWithQuery } from "@/test/query";
import { useAppForm } from "../app-form";
import { MoneyPairField } from "./money-pair-field";

const currencies: CurrenciesResponse = {
  reportingCurrency: "eur",
  currencies: ["eur", "usd"],
  ratesAsOf: null,
};

interface Values {
  sent: string;
  sentCurrency: Currency;
}

function Harness() {
  const defaultValues: Values = { sent: "", sentCurrency: "eur" };
  const form = useAppForm({ defaultValues });

  return (
    <>
      <MoneyPairField
        form={form}
        fields={{ amount: "sent", currency: "sentCurrency" }}
        id="sent"
        label="Sent"
        currencyLabel="Sent currency"
      />
      <form.Subscribe selector={(state) => state.values}>
        {(values) => <output>{`${values.sent} ${values.sentCurrency}`}</output>}
      </form.Subscribe>
    </>
  );
}

test("binds the amount and the currency to the named form fields", async () => {
  renderWithQuery(<Harness />, { currencies });

  await userEvent.type(screen.getByLabelText("Sent"), "12.50");
  await userEvent.click(screen.getByRole("combobox", { name: "Sent currency" }));
  await userEvent.click(await screen.findByRole("option", { name: /USD/u }));

  expect(screen.getByRole("status")).toHaveTextContent("12.50 usd");
});
