import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { getHouseholdsMockHandler } from "@/api/generated/households/households.msw";
import { setActiveHousehold } from "@/stores/active-household-store";
import { withWidth } from "@/storybook/decorators";
import { familyHousehold } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { HouseholdSwitcher } from "./household-switcher";

const meta = {
  title: "Components/HouseholdSwitcher",
  component: HouseholdSwitcher,
  decorators: [withWidth("w-58 bg-sidebar p-3")],
  beforeEach: () => {
    setActiveHousehold(undefined);
    return () => setActiveHousehold(undefined);
  },
} satisfies Meta<typeof HouseholdSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Everything: Story = {};

export const OneHouseholdActive: Story = {
  beforeEach: () => {
    setActiveHousehold(familyHousehold.id);
    return () => setActiveHousehold(undefined);
  },
};

export const Collapsed: Story = {
  args: { collapsed: true },
  decorators: [withWidth("w-16 bg-sidebar p-2")],
};

export const NoHouseholds: Story = {
  parameters: withHandlers(getHouseholdsMockHandler([])),
};

export const Switching: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Active household: Everything" }));
    await userEvent.click(await screen.findByRole("option", { name: familyHousehold.name }));

    await expect(
      await canvas.findByRole("combobox", { name: `Active household: ${familyHousehold.name}` }),
    ).toBeVisible();
  },
};
