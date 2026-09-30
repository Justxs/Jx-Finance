import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import { CategoryIcon } from "@/lib/category-icons";
import { familyHousehold } from "@/storybook/fixtures";
import { NamedRow } from "./named-row";

const meta = {
  title: "Components/NamedRow",
  component: NamedRow,
  args: {
    name: "Atostogos",
    scope: "personal",
    householdId: null,
    onEdit: fn(),
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <Rows>
        <NamedRow {...args} />
      </Rows>
    </div>
  ),
} satisfies Meta<typeof NamedRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Shared: Story = { args: { scope: "shared", householdId: familyHousehold.id } };

export const SharedHouseholdMissing: Story = {
  args: { scope: "shared", householdId: null },
};

export const WithIcon: Story = {
  args: {
    name: "Maistas",
    leading: <CategoryIcon icon="shopping-bag" className="shrink-0 text-muted-foreground" />,
  },
};

export const LongName: Story = {
  args: { name: "Namų ūkio prekės, remontas ir sodo priežiūra šį sezoną" },
};

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };
