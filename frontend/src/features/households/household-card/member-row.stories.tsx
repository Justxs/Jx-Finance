import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { fn } from "storybook/test";
import { familyHousehold, gardenHousehold, householdMembers } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { MemberRow } from "./member-row";

const meta = {
  title: "Features/Households/MemberRow",
  component: MemberRow,
  parameters: { route: "/households" },
  args: {
    householdId: familyHousehold.id ?? "",
    member: householdMembers[1]!,
    isOwnerView: true,
    onRemove: fn(),
    removePending: false,
    removeDisabled: false,
    onSaved: fn(),
  },
  render: (args) => (
    <ul className="rows w-[36rem] max-w-full">
      <MemberRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof MemberRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnerView: Story = {};

export const OwnerViewOfOwner: Story = { args: { member: householdMembers[0]! } };

export const MemberView: Story = { args: { isOwnerView: false } };

export const MemberViewOfOwner: Story = {
  args: { isOwnerView: false, member: householdMembers[0]! },
};

export const LongNameAndEmail: Story = { args: { member: gardenHousehold.members![0]! } };

export const LongNameMemberViewNarrow: Story = {
  args: { isOwnerView: false, member: gardenHousehold.members![0]! },
  render: (args) => (
    <ul className="rows w-72">
      <MemberRow {...args} />
    </ul>
  ),
};

export const RemovePending: Story = { args: { removePending: true, removeDisabled: true } };

export const RemoveDisabled: Story = { args: { removeDisabled: true } };

export const RoleChangePendingAfterSelect: Story = {
  parameters: {
    msw: {
      handlers: [
        http.put("*/api/households/:id/members/:userId", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};
