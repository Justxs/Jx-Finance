import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import { RecordRow } from "./record-row";

const meta = {
  title: "Components/RecordRow",
  component: RecordRow,
  args: {
    title: "Everyday → Savings",
    subtitle: "Sep 18, 2026 · Monthly sweep",
    amount: "€250.00",
    label: "Everyday → Savings, Sep 18, 2026",
    onEdit: fn(),
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  render: (args) => (
    <Rows className="w-[min(90vw,40rem)]">
      <RecordRow {...args} />
    </Rows>
  ),
} satisfies Meta<typeof RecordRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadOnly: Story = {
  args: { onEdit: undefined, note: "Imported from the broker, so it cannot be edited." },
};

export const Deleting: Story = { args: { deletePending: true, deleteDisabled: true } };
