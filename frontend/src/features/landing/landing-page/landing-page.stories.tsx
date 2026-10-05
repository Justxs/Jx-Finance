import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { SETUP_URL, SOURCE_URL } from "@/features/landing/landing-shell/landing-shell";
import { publicSettings } from "@/storybook/fixtures";
import { supportLinkOffHandler, withHandlers } from "@/storybook/handlers";
import { LandingPage } from "./landing-page";

const meta = {
  title: "Features/Landing/LandingPage",
  component: LandingPage,
  parameters: { layout: "fullscreen", route: "/" },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 1,
        name: "Your personal finances, kept private",
      }),
    ).toBeVisible();
    const signIn = canvas.getAllByRole("link", { name: "Sign in" });
    await expect(signIn.map((link) => link.getAttribute("href"))).toEqual([
      "/login",
      "/login",
      "/login",
    ]);
    await expect(
      canvas.getByRole("link", { name: "See it on GitHub (opens in a new tab)" }),
    ).toHaveAttribute("href", SOURCE_URL);
    await expect(
      canvas.getByRole("link", { name: "Read the setup guide (opens in a new tab)" }),
    ).toHaveAttribute("href", SETUP_URL);
    await expect(
      await canvas.findByRole("link", { name: "Support me on Ko-fi (opens in a new tab)" }),
    ).toHaveAttribute("href", "https://ko-fi.com/justxs");
  },
};

export const SampleLedgerReadsAsAStatement: Story = {
  play: async ({ canvas }) => {
    const ledger = within(canvas.getByRole("list", { name: "Sample ledger" }));
    await expect(ledger.getAllByRole("listitem")).toHaveLength(6);
    await expect(canvas.getByText("Sample data")).toBeVisible();
    await expect(canvas.getByText("+€2,013.55")).toBeVisible();
  },
};

export const SupportLinkSwitchedOff: Story = {
  parameters: withHandlers(supportLinkOffHandler),
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { name: "Want your own?" });
    await expect(
      canvas.queryByRole("link", { name: "Support me on Ko-fi (opens in a new tab)" }),
    ).toBeNull();
  },
};

export const InstallationName: Story = {
  parameters: withHandlers(
    getPublicSettingsMockHandler({ ...publicSettings, instanceName: "Pranauskų namų ūkis" }),
  ),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Dark: Story = { globals: { theme: "dark" } };
