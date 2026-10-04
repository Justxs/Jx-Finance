import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getBudgetsMockHandler } from "@/api/generated/budgets/budgets.msw";
import type { BudgetResponse } from "@/api/generated/model";
import { budgets, familyHousehold, sharedByPartner } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { BudgetsPage } from "./budgets-page";

const api = mockApi();
const entertainment = budgets[2]!;

async function openedDialog(role: "dialog" | "alertdialog") {
  const dialog = await screen.findByRole(role);
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

async function renderWith(shared: BudgetResponse) {
  api.use(
    getBudgetsMockHandler(budgets.map((budget) => (budget.id === shared.id ? shared : budget))),
  );
  renderInApp(<BudgetsPage />, { path: "/budgets" });
  await screen.findByRole("button", { name: `Edit: ${shared.name}` });
}

test("the owner of a shared budget may delete it and change its visibility", async () => {
  await renderWith({ ...entertainment, scope: "shared", householdId: familyHousehold.id });

  expect(screen.getByRole("button", { name: `Delete: ${entertainment.name}` })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: `Edit: ${entertainment.name}` }));

  expect(
    await (await openedDialog("dialog")).findByRole("combobox", { name: "Visibility" }),
  ).toBeInTheDocument();
});

test("another member edits a shared budget but cannot delete it or change its visibility", async () => {
  await renderWith(sharedByPartner(entertainment));

  expect(screen.queryByRole("button", { name: `Delete: ${entertainment.name}` })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: `Edit: ${entertainment.name}` }));
  const dialog = await openedDialog("dialog");
  expect(dialog.queryByRole("combobox", { name: "Visibility" })).toBeNull();
  fireEvent.change(dialog.getByRole("textbox", { name: "Limit" }), { target: { value: "80" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("PUT", `/api/budgets/${entertainment.id}`)).toMatchObject({
    scope: "shared",
    householdId: familyHousehold.id,
  });
});

async function periodSpansRow(budget: BudgetResponse) {
  await renderWith(budget);
  await userEvent.click(screen.getByRole("button", { name: `Edit: ${budget.name}` }));
  const period = (await openedDialog("dialog")).getByRole("combobox", { name: "Period" });
  return period.closest(".col-span-full") !== null;
}

test("the period field fills its row when hiding the visibility field would leave it alone", async () => {
  expect(await periodSpansRow(sharedByPartner(entertainment))).toBe(true);
});

test("the period field shares its row with the visibility field of a personal budget", async () => {
  expect(await periodSpansRow({ ...entertainment, scope: "personal", householdId: null })).toBe(
    false,
  );
});
