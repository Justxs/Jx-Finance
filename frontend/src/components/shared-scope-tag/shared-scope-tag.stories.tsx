import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { familyHousehold } from "@/storybook/fixtures";
import { SharedScopeTag } from "./shared-scope-tag";

const meta = {
  title: "Components/SharedScopeTag",
  component: SharedScopeTag,
  args: { scope: "shared", householdId: familyHousehold.id },
} satisfies Meta<typeof SharedScopeTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shared: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Kazlauskų šeima/)).toBeVisible();
  },
};

export const Personal: Story = {
  args: { scope: "personal", householdId: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toBe("");
  },
};
