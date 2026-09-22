import { act, fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { mortgageSchedule, mortgageScheduleWithExtra } from "@/storybook/fixtures";
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
      draft={{ ...noExtraPayments, extraMonthly: "150.00" }}
      schedule={faster}
      onChange={vi.fn()}
    />,
  );

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(`${faster.paymentsSaved} payments sooner`);
  expect(status).toHaveTextContent(/saving €[\d,]+\.\d{2} in interest/);
});

test("without an overpayment the sentence asks for an amount", () => {
  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
      draft={noExtraPayments}
      schedule={mortgageSchedule}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent(
    "Enter an amount to see how much sooner the debt is repaid.",
  );
});

test("an invalid amount is marked and explained", () => {
  renderWithQuery(
    <DebtExtraPayments
      idPrefix="extra"
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
