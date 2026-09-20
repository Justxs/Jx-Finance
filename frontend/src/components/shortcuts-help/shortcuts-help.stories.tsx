import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { registerShortcuts } from "@/lib/shortcuts";
import {
  isShortcutsHelpOpen,
  setShortcutsHelpOpen,
  toggleShortcutsHelp,
} from "@/stores/shortcuts-help-store";
import { withWidth } from "@/storybook/decorators";
import { ShortcutsHelp } from "./shortcuts-help";

const storyRouter = {
  state: { location: { pathname: "/" } },
  navigate: () => undefined,
};

const meta = {
  title: "Components/ShortcutsHelp",
  component: ShortcutsHelp,
  decorators: [withWidth("flex min-h-[32rem] items-end p-4")],
  beforeEach: () => {
    setShortcutsHelpOpen(false);
    return () => setShortcutsHelpOpen(false);
  },
} satisfies Meta<typeof ShortcutsHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  beforeEach: () => {
    setShortcutsHelpOpen(true);
  },
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await expect(within(dialog).getAllByRole("listitem")).toHaveLength(14);
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  beforeEach: () => {
    setShortcutsHelpOpen(true);
  },
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog");
    await within(dialog).findByText("Spartieji klavišai");
  },
};

export const OpenedByQuestionMark: Story = {
  beforeEach: () => registerShortcuts(storyRouter, toggleShortcutsHelp, isShortcutsHelpOpen),
  play: async () => {
    const body = within(document.body);
    await expect(body.queryByRole("dialog")).toBeNull();
    await fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    const dialog = await body.findByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    await body.findByRole("dialog");
  },
};
