import { act, fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  buildDebtSchedule,
  mortgageSchedule,
  mortgageScheduleWithExtra,
  mortgageScheduleWithLumpSum,
  zeroRateDebt,
} from "@/storybook/fixtures";
import { renderWithQuery } from "@/test/query";
import { DebtExtraPayments, extraPaymentParams, noExtraPayments } from "./debt-extra-payments";

test("only valid positive amounts become query parameters, and a lump sum needs its date", () => {
  expect(extraPaymentParams(noExtraPayments)).toEqual({});
  expect(extraPaymentParams({ ...noExtraPayments, extraMonthly: "150,5" })).toEqual({
    extraMonthly: "150.5",
  });
  expect(extraPaymentParams({ ...noExtraPayments, extraMonthly: "-5" })).toEqual({});
  expect(extraPaymentParams({ ...noExtraPayments, extraMonthly: "0" })).toEqual({});
  expect(extraPaymentParams({ ...noExtraPayments, lumpSum: "5000" })).toEqual({});
  expect(
    extraPaymentParams({ extraMonthly: "", lumpSum: "5000", lumpSumDate: "2027-01-01" }),
  ).toEqual({ lumpSum: "5000", lumpSumDate: "2027-01-01" });
});

test("typing an extra amount commits it once typing pauses", () => {
  vi.useFakeTimers();
  const onChange = vi.fn();

  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={noExtraPayments}
      schedule={mortgageSchedule}
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText("Extra each month"), { target: { value: "150" } });
  expect(onChange).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(500);
  });

  expect(onChange).toHaveBeenCalledWith("extraMonthly", "150");
  vi.useRealTimers();
});

test("the savings sentence names the payments saved and the interest saved", () => {
  const faster = mortgageScheduleWithExtra;

  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={{ ...noExtraPayments, extraMonthly: "150.00" }}
      schedule={faster}
      onChange={vi.fn()}
    />,
  );

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(`${faster.paymentsSaved} payments sooner`);
  expect(status).toHaveTextContent(/saving €[\d,]+\.\d{2} in interest/);
});

test("a lump sum shows the shorter term and the lower payment side by side", () => {
  const lower = mortgageScheduleWithLumpSum.lowerPayment;

  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={{ extraMonthly: "", lumpSum: "10000.00", lumpSumDate: "2026-10-01" }}
      schedule={mortgageScheduleWithLumpSum}
      onChange={vi.fn()}
    />,
  );

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Shorter term");
  expect(status).toHaveTextContent("Lower payment");
  expect(lower?.payment).not.toBeNull();
  expect(Number(lower?.payment)).toBeLessThan(Number(lower?.paymentBefore));
  expect(status).toHaveTextContent(
    /Instead of €[\d,]+\.\d{2} from .+, saving €[\d,]+\.\d{2} in interest/,
  );
});

test("a lump sum that repays the debt says so instead of a lower payment", () => {
  const extra = { lumpSum: "10000.00", lumpSumDate: "2026-10-01" };

  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={{ extraMonthly: "", ...extra }}
      schedule={buildDebtSchedule(zeroRateDebt, extra)}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent(
    "The overpayment repays the debt, saving €0.00 in interest.",
  );
});

test("without an overpayment the sentence asks for an amount", () => {
  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={noExtraPayments}
      schedule={mortgageSchedule}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent(
    "Enter an amount to see how much sooner the debt is repaid, or how much lower the payment gets.",
  );
});

test("an invalid amount is marked and explained", () => {
  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      currency="eur"
      draft={noExtraPayments}
      schedule={mortgageSchedule}
      onChange={vi.fn()}
    />,
  );
  const input = screen.getByLabelText("One-off payment");
  fireEvent.change(input, { target: { value: "abc" } });

  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", "extra-lump-sum-error");
});
