import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { i18n } from "@/lib/i18n";
import { isShortcutsHelpOpen, setShortcutsHelpOpen } from "@/stores/shortcuts-help-store";
import { withWidth } from "@/storybook/decorators";
import { longNameUser } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { AccountMenu } from "./account-menu";

const triggerName = /Account menu/;

const meta = {
  title: "Components/AccountMenu",
  component: AccountMenu,
  args: { className: "w-full" },
  decorators: [withWidth("flex min-h-96 w-58 items-end bg-sidebar p-3")],
  beforeEach: () => {
    setShortcutsHelpOpen(false);
    return () => setShortcutsHelpOpen(false);
  },
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: { compact: true, side: "right", align: "end", className: undefined },
  decorators: [withWidth("flex min-h-96 w-16 items-end bg-sidebar p-2")],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await expect(await screen.findByText("ruta.kazlauskiene@example.lt")).toBeVisible();
  },
};

export const LongUserName: Story = {
  parameters: withHandlers(getMeMockHandler(longNameUser)),
};

export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    const items = await screen.findAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Your profile",
      "LanguageEnglish",
      "ThemeLight",
      "Keyboard shortcuts?",
      "Log out",
    ]);
  },
};

export const SwitchesLanguageAndTheme: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Language/ }));
    await expect(i18n.language).toBe("lt");
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Kalba/ }));
    await expect(i18n.language).toBe("en");

    const theme = screen.getByRole("menuitem", { name: /^Theme/ });
    await userEvent.click(theme);
    await expect(document.documentElement).toHaveClass("dark");
    await expect(theme).toHaveTextContent("Dark");
    await userEvent.click(theme);
    await expect(document.documentElement).not.toHaveClass("dark");
  },
};

export const OpensShortcutsHelp: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Keyboard shortcuts/ }));
    await waitFor(() => expect(isShortcutsHelpOpen()).toBe(true));
  },
};
