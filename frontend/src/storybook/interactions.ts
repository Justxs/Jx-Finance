import type { StoryContext } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";

export type Canvas = StoryContext["canvas"];

export function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error("expected at least one match");
  }
  return item;
}

export async function chooseOption(trigger: HTMLElement, option: string | RegExp) {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name: option }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

export async function openedDialog(role: "dialog" | "alertdialog" = "dialog") {
  const dialog = await screen.findByRole(role);
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}
