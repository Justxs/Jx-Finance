import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { familyHousehold, ids, payeeNames, settingsWith, tags } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { TagsPage } from "./tags-page";

const api = mockApi();
const holiday = tags.find((tag) => tag.id === ids.tags.holiday)!;
const renovation = tags.find((tag) => tag.id === ids.tags.renovation)!;
const maxima = payeeNames[0]!;

async function openedDialog(role: "dialog" | "alertdialog") {
  const dialog = await screen.findByRole(role);
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

async function renderPage() {
  const view = renderInApp(<TagsPage />, { path: "/tags" });
  await screen.findByText(holiday.name);
  return view;
}

test("a shared tag names its household and a personal one does not", async () => {
  await renderPage();

  const sharedRow = screen.getByText(renovation.name).closest("li")!;
  const personalRow = screen.getByText(holiday.name).closest("li")!;

  expect(within(sharedRow).getByText(`Shared · ${familyHousehold.name}`)).toBeInTheDocument();
  expect(within(personalRow).queryByText(/^Shared/u)).not.toBeInTheDocument();
});

test("cancelling a tag delete sends nothing", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Delete: ${holiday.name}` }));
  await userEvent.click(
    (await openedDialog("alertdialog")).getByRole("button", { name: "Cancel" }),
  );

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("DELETE", `/api/tags/${holiday.id}`)).toHaveLength(0);
  expect(screen.getByText(holiday.name)).toBeInTheDocument();
});

test("a confirmed tag delete is sent and its undo restores the tag", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Delete: ${holiday.name}` }));
  await userEvent.click(
    (await openedDialog("alertdialog")).getByRole("button", { name: "Delete" }),
  );

  await waitFor(() => expect(api.sent("DELETE", `/api/tags/${holiday.id}`)).toHaveLength(1));
  expect(await screen.findByText(`Deleted ${holiday.name}`)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(await screen.findByText("Brought back")).toBeInTheDocument();
  expect(await api.lastBody("POST", "/api/trash/restore")).toEqual({
    kind: "tag",
    entityId: holiday.id,
  });
});

test("editing a tag from its row saves it under its id and closes the dialog", async () => {
  await renderPage();

  await userEvent.click(screen.getByRole("button", { name: `Edit: ${renovation.name}` }));
  const dialog = await openedDialog("dialog");
  expect(dialog.getByRole("heading", { name: `Edit tag: ${renovation.name}` })).toBeInTheDocument();
  fireEvent.change(dialog.getByRole("textbox", { name: "Name" }), {
    target: { value: "Virtuvės remontas" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("PUT", `/api/tags/${renovation.id}`)).toEqual({
    name: "Virtuvės remontas",
    scope: "shared",
    householdId: familyHousehold.id,
  });
});

test("a payee name is deleted after confirmation without an undo offer", async () => {
  const { queryClient } = await renderPage();

  await userEvent.click(await screen.findByRole("button", { name: `Delete: ${maxima.name}` }));
  const dialog = await openedDialog("alertdialog");
  expect(dialog.getByText("This can't be undone.")).toBeInTheDocument();
  await userEvent.click(dialog.getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(api.sent("DELETE", `/api/payees/${maxima.id}`)).toHaveLength(1));
  await waitFor(() => expect(queryClient.isMutating()).toBe(0));
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
});

test("payee names are left out while their switch is off", async () => {
  api.use(getSettingsMockHandler(settingsWith({ features: { payeeNames: false } })));
  await renderPage();

  await waitFor(() => expect(screen.queryByRole("heading", { name: "Payee names" })).toBeNull());
});
