import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { mortgageSchedule, mortgageScheduleWithExtra } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { DebtScheduleTable, SCHEDULE_PAGE_SIZE, firstPageToShow } from "./debt-schedule-table";

const { plan, asOf } = mortgageSchedule;
const pageCount = Math.ceil(plan.rows.length / SCHEDULE_PAGE_SIZE);

function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

function firstCell(row: HTMLElement | undefined) {
  if (!row) {
    throw new Error("no row");
  }
  return within(row).getAllByRole("cell")[0];
}

test("the table opens on the page that holds the next payment", () => {
  const { Wrapper } = createQueryWrapper();
  const nextIndex = plan.rows.findIndex((row) => row.date > asOf);

  render(<DebtScheduleTable plan={plan} asOf={asOf} />, { wrapper: Wrapper });

  const expectedPage = Math.floor(nextIndex / SCHEDULE_PAGE_SIZE) + 1;
  expect(screen.getByText(`Page ${expectedPage} of ${pageCount}`)).toBeInTheDocument();
  const numbers = bodyRows().map((row) => firstCell(row)?.textContent);
  expect(numbers).toContain(String(nextIndex + 1));
  expect(bodyRows()).toHaveLength(SCHEDULE_PAGE_SIZE);
});

test("the last page holds the payoff and paging goes back from it", () => {
  const { Wrapper } = createQueryWrapper();

  render(<DebtScheduleTable plan={plan} asOf="2099-01-01" />, { wrapper: Wrapper });

  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(firstCell(bodyRows().at(-1))).toHaveTextContent(String(plan.rows.length));
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  expect(screen.getByText(`Page ${pageCount - 1} of ${pageCount}`)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
});

test("the overpayment column appears only when a row carries an overpayment", () => {
  const { Wrapper } = createQueryWrapper();
  const faster = mortgageScheduleWithExtra.withExtra;
  if (!faster) {
    throw new Error("the fixture has no overpayment plan");
  }

  const { rerender } = render(<DebtScheduleTable plan={plan} asOf={asOf} />, {
    wrapper: Wrapper,
  });
  expect(screen.queryByRole("columnheader", { name: "Overpayment" })).toBeNull();

  rerender(<DebtScheduleTable plan={faster} asOf={asOf} />);
  expect(screen.getByRole("columnheader", { name: "Overpayment" })).toBeInTheDocument();
});

test("a schedule that has not started opens on the first page and a finished one on the last", () => {
  expect(firstPageToShow(plan, "2000-01-01")).toBe(1);
  expect(firstPageToShow(plan, "2099-01-01")).toBe(pageCount);
});
