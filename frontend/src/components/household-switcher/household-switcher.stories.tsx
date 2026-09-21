import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getHouseholdsMockHandler } from "@/api/generated/households/households.msw";
import { setActiveHousehold } from "@/stores/active-household-store";
import { familyHousehold } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { QueryBoundary } from "../query-boundary/query-boundary";
import { Skeleton } from "../ui/skeleton/skeleton";
import { HouseholdSwitcher } from "./household-switcher";

const meta = {
  title: "Components/HouseholdSwitcher",
  component: HouseholdSwitcher,
  decorators: [
    (Story) => (
      <div className="w-58 bg-sidebar p-3">
        <QueryBoundary fallback={<Skeleton className="h-8 w-full rounded-lg" />}>
          <Story />
        </QueryBoundary>
      </div>
    ),
  ],
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
  decorators: [
    (Story) => (
      <div className="w-16 bg-sidebar p-2">
        <Story />
      </div>
    ),
  ],
};

export const NoHouseholds: Story = {
  parameters: { msw: { handlers: [getHouseholdsMockHandler([]), ...handlers] } },
};

export const Switching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(canvas.getByRole("combobox", { name: "Active household: Everything" }));
    await userEvent.click(await body.findByRole("option", { name: familyHousehold.name }));

    await expect(
      await canvas.findByRole("combobox", { name: `Active household: ${familyHousehold.name}` }),
    ).toBeVisible();
  },
};
