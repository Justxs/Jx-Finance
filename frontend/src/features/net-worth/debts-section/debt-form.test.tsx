import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { debts, linearDebt, zeroRateDebt } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { DebtForm, debtFormValues, debtRequest } from "./debt-form";

test("a debt read into the form and written back keeps every repayment term", () => {
  for (const debt of [...debts, linearDebt, zeroRateDebt]) {
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
    amortizationType: "unknown",
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
    amortizationType: "annuity",
  });
});

test("a term and a monthly payment together are refused under the payment", async () => {
  const { Wrapper } = createQueryWrapper();

  render(<DebtForm onCreated={() => {}} onCancel={() => {}} />, { wrapper: Wrapper });
  fireEvent.change(screen.getByLabelText("Term, months"), { target: { value: "360" } });
  fireEvent.change(screen.getByLabelText("Monthly payment"), { target: { value: "500" } });

  expect(
    await screen.findByText("Give a term or a monthly payment, not both."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Monthly payment")).toHaveAttribute("aria-invalid", "true");
});

test("a term outside 1 to 600 months is refused", async () => {
  const { Wrapper } = createQueryWrapper();

  render(<DebtForm onCreated={() => {}} onCancel={() => {}} />, { wrapper: Wrapper });
  fireEvent.change(screen.getByLabelText("Term, months"), { target: { value: "601" } });

  expect(await screen.findByText("Enter a whole number from 1 to 600.")).toBeInTheDocument();
});
