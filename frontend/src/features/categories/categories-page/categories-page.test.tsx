import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { categories, familyHousehold, ids, settingsWith } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { CategoriesPage } from "./categories-page";

const api = mockApi();
const food = categories.find((category) => category.id === ids.categories.food)!;
const cafes = categories.find((category) => category.id === ids.categories.cafes)!;
const transport = categories.find((category) => category.id === ids.categories.transport)!;
const sharedGoods = categories.find((category) => category.id === ids.categories.householdGoods)!;

function section(title: string) {
  return screen.getByRole("heading", { name: title }).closest("section")!;
}

async function openedDialog(role: "dialog" | "alertdialog") {
  const dialog = await screen.findByRole(role);
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

async function renderPage() {
  renderInApp(<CategoriesPage />, { path: "/categories" });
  await screen.findByText(food.name);
}

test("sub-categories are listed straight under their group, each type in its own section", async () => {
  await renderPage();

  const expenseNames = within(section("Expense"))
    .getAllByRole("listitem")
    .map((row) => row.textContent);
  const foodAt = expenseNames.findIndex((name) => name?.startsWith(food.name));
  expect(expenseNames[foodAt + 1]).toContain(cafes.name);
  expect(within(section("Income")).queryByText(food.name)).not.toBeInTheDocument();
  expect(within(section("Income")).getByText("Atlyginimas")).toBeInTheDocument();
});

test("a shared category names the household it is shared with", async () => {
  await renderPage();

  const row = screen.getByText(sharedGoods.name).closest("li")!;

  expect(within(row).getByText(`Shared · ${familyHousehold.name}`)).toBeInTheDocument();
});

test("cancelling a delete sends nothing", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Delete: ${transport.name}` }));
  const dialog = await openedDialog("alertdialog");
  expect(dialog.getByText(transport.name)).toBeInTheDocument();
  await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("DELETE", `/api/categories/${transport.id}`)).toHaveLength(0);
});

test("a confirmed delete is sent and its undo restores the category", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Delete: ${transport.name}` }));
  const dialog = await openedDialog("alertdialog");
  expect(dialog.getByText(/You can undo this straight away/u)).toBeInTheDocument();
  await userEvent.click(dialog.getByRole("button", { name: "Delete" }));

  await waitFor(() =>
    expect(api.sent("DELETE", `/api/categories/${transport.id}`)).toHaveLength(1),
  );
  expect(await screen.findByText(`Deleted ${transport.name}`)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(await screen.findByText("Brought back")).toBeInTheDocument();
  expect(await api.lastBody("POST", "/api/trash/restore")).toEqual({
    kind: "category",
    entityId: transport.id,
  });
});

test("editing from a row opens the category and saves it under its id", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Edit: ${transport.name}` }));
  const dialog = await openedDialog("dialog");
  expect(
    dialog.getByRole("heading", { name: `Edit category: ${transport.name}` }),
  ).toBeInTheDocument();
  expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue(transport.name);
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), {
    target: { value: "Kelionės" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("PUT", `/api/categories/${transport.id}`)).toMatchObject({
    name: "Kelionės",
  });
});

test("adding from the header creates the category and closes the dialog", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: "Add category" }));
  const dialog = await openedDialog("dialog");
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), { target: { value: "Gyvūnai" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("POST", "/api/categories")).toMatchObject({ name: "Gyvūnai" });
});

test("remembered receipt items close the page while receipt reading is on", async () => {
  await renderPage();
  expect(
    await screen.findByRole("heading", { name: "Remembered receipt items" }),
  ).toBeInTheDocument();
});

test("with receipt reading switched off the remembered items are not shown", async () => {
  api.use(getSettingsMockHandler(settingsWith({ features: { receiptReading: false } })));
  await renderPage();

  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "Remembered receipt items" })).toBeNull(),
  );
});
