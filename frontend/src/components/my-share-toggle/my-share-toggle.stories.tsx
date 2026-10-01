import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { readPreferences, savePreferences } from "@/stores/preferences";
import { settingsWith } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { MyShareToggle } from "./my-share-toggle";

const meta = {
  title: "Components/MyShareToggle",
  component: MyShareToggle,
  beforeEach() {
    savePreferences({ myShare: false });
  },
} satisfies Meta<typeof MyShareToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Toggles: Story = {
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole("button", { name: "My share" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(readPreferences().myShare).toBe(true);
    await userEvent.click(toggle);
    await expect(readPreferences().myShare).toBe(false);
  },
};

export const WithoutHouseholds: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(settingsWith({ features: { households: false } })),
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.queryByRole("button", { name: "My share" })).toBeNull());
  },
};
