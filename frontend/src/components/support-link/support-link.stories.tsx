import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { savePreferences } from "@/stores/preferences";
import { withWidth } from "@/storybook/decorators";
import { settingsWith } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { SUPPORT_URL, SupportLink, SupportLinkSetting } from "./support-link";

const meta = {
  title: "Components/SupportLink",
  component: SupportLink,
  decorators: [withWidth("narrow")],
  beforeEach: () => {
    savePreferences({ supportLinkHidden: false });
  },
} satisfies Meta<typeof SupportLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Support me on Ko-fi" })).toHaveAttribute(
      "href",
      SUPPORT_URL,
    );
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Collapsed: Story = { args: { collapsed: true } };

export const HiddenInThisBrowser: Story = {
  beforeEach: () => {
    savePreferences({ supportLinkHidden: true });
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const OffForTheInstallation: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ supportLinkEnabled: false }))),
  render: () => (
    <>
      <SupportLinkSetting />
      <SupportLink />
    </>
  ),
  decorators: [withWidth("panel")],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/turned the Ko-fi link off/u)).toBeVisible();
    await expect(canvas.queryByRole("checkbox")).toBeNull();
    await expect(canvas.getAllByRole("link")).toHaveLength(1);
  },
};

export const Setting: Story = {
  decorators: [withWidth("panel")],
  render: () => (
    <>
      <SupportLinkSetting />
      <SupportLink />
    </>
  ),
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole("checkbox", { name: /Show the Ko-fi link/u });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(1));
  },
};
