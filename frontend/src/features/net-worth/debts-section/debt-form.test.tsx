import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getHouseholdsQueryKey } from "@/api/generated";
import {
  debts,
  households,
  linearDebt,
  sharedTrackedMortgage,
  trackedMortgage,
  zeroRateDebt,
} from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { DebtForm, debtFormValues, debtRequest } from "./debt-form";

function renderForm() {
  const { client, Wrapper } = createQueryWrapper();
  client.setQueryData(getHouseholdsQueryKey(), households);
  render(<DebtForm onClose={() => {}} />, { wrapper: Wrapper });
}

test("a debt read into the form and written back keeps every repayment term and its sharing", () => {
  for (const debt of [...debts, linearDebt, zeroRateDebt, trackedMortgage, sharedTrackedMortgage]) {
    expect(debtRequest(debtFormValues(debt))).toEqual({
      name: debt.name,
      type: debt.type,
      outstandingAmount: debt.outstandingAmount,
      interestRate: debt.interestRate,
      asOf: debt.asOf,
      loanAmount: debt.loanAmount,
      firstPaymentDate: debt.firstPaymentDate,
      termMonths: debt.termMonths,
      monthlyPayment: debt.monthlyPayment,
      amortizationType: debt.amortizationType,
      tracksPayments: debt.tracksPayments,
      scope: debt.scope,
      householdId: debt.householdId,
    });
  }
});

test("empty repayment fields are sent as null and a comma is read as a decimal point", () => {
  const request = debtRequest({
    name: "  Loan ",
    type: "loan",
    amount: "1000,50",
    interestRate: "",
    asOf: "2026-09-01",
    loanAmount: " ",
    firstPaymentDate: "",
    termMonths: " ",
    monthlyPayment: "",
    amortizationType: "linear",
    tracksPayments: true,
    scope: "personal",
    householdId: "",
  });

  expect(request).toEqual({
    name: "Loan",
    type: "loan",
    outstandingAmount: "1000.50",
    interestRate: null,
    asOf: "2026-09-01",
    loanAmount: null,
    firstPaymentDate: null,
    termMonths: null,
    monthlyPayment: null,
    amortizationType: "linear",
    tracksPayments: true,
    scope: "personal",
    householdId: null,
  });
});

test("a term and a monthly payment together are refused under the payment", async () => {
  renderForm();
  fireEvent.change(screen.getByLabelText("Term, months"), { target: { value: "360" } });
  fireEvent.change(screen.getByLabelText("Monthly payment"), { target: { value: "500" } });

  expect(
    await screen.findByText("Give a term or a monthly payment, not both."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Monthly payment")).toHaveAttribute("aria-invalid", "true");
});

test("a term outside 1 to 600 months is refused", async () => {
  renderForm();
  fireEvent.change(screen.getByLabelText("Term, months"), { target: { value: "601" } });

  expect(await screen.findByText("Enter a whole number from 1 to 600.")).toBeInTheDocument();
});

test("tracking payments asks for the balance and the date it is good for", async () => {
  renderForm();
  expect(screen.queryByLabelText("Balance on")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("checkbox", { name: "Track payments" }));

  expect(await screen.findByLabelText("Balance on")).toBeInTheDocument();
  expect(screen.getByLabelText("Balance")).toBeInTheDocument();
});
