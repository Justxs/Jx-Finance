import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getRemoveMemberMockHandler,
  getUpdateHouseholdMockHandler,
} from "@/api/generated/households/households.msw";
import { familyHousehold, gardenHousehold, householdMembers } from "@/storybook/fixtures";
import { handlers, pending } from "@/storybook/handlers";
import { HouseholdCard } from "./household-card";

const meta = {
  title: "Features/Households/HouseholdCard",
  component: HouseholdCard,
  parameters: { route: "/households" },
  args: { household: familyHousehold },
  render: (args) => (
    <div className="w-[40rem] max-w-full">
      <HouseholdCard {...args} />
    </div>
  ),
} satisfies Meta<typeof HouseholdCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnerView: Story = {};

export const MemberView: Story = { args: { household: gardenHousehold } };

export const LongNameOwnerView: Story = {
  args: { household: { ...gardenHousehold, myRole: "owner" } },
};

export const SoleOwner: Story = {
  args: { household: { ...familyHousehold, members: [householdMembers[0]!] } },
};

export const NoMembers: Story = { args: { household: { ...familyHousehold, members: [] } } };

export const ManyMembers: Story = {
  args: {
    household: {
      ...familyHousehold,
      members: Array.from({ length: 12 }, (_, index) => ({
        userId: `member-${index}`,
        email: `narys${index + 1}@example.lt`,
        displayName: `Household member ${index + 1}`,
        role: index === 0 ? ("owner" as const) : ("member" as const),
      })),
    },
  },
};

export const NarrowOwnerView: Story = {
  args: { household: { ...gardenHousehold, myRole: "owner" } },
  render: (args) => (
    <div className="w-80">
      <HouseholdCard {...args} />
    </div>
  ),
};

export const SlowMutations: Story = {
  parameters: {
    msw: {
      handlers: [
        getRemoveMemberMockHandler(pending),
        getUpdateHouseholdMockHandler(pending),
        ...handlers,
      ],
    },
  },
};
