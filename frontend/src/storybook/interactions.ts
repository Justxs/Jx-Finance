import { expect, userEvent, waitFor, within } from "storybook/test";

export function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error("expected at least one match");
  }
  return item;
}

export async function chooseOption(trigger: HTMLElement, option: string | RegExp) {
  const body = within(document.body);
  await userEvent.click(trigger);
  await userEvent.click(await body.findByRole("option", { name: option }));
  await waitFor(() => expect(body.queryByRole("listbox")).toBeNull());
}

export async function openedDialog(role: "dialog" | "alertdialog" = "dialog") {
  const dialog = await within(document.body).findByRole(role);
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}
