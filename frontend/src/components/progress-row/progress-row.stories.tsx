import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { ProgressAmount, ProgressRow } from "./progress-row";

const meta = {
  title: "Components/ProgressRow",
  component: ProgressRow,
  args: {
    label: "Groceries",
    title: "Groceries",
    meta: <p className="text-xs text-muted-foreground">Monthly · Sep 1 – Sep 30, 2026</p>,
    primary: <ProgressAmount amount="€312.40" of="of €450.00" />,
    secondary: <p className="text-xs text-muted-foreground tabular-nums">€137.60 left</p>,
    meter: { value: 312.4, max: 450, tone: "primary" },
    onEdit: fn(),
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  render: (args) => (
    <Rows className="w-[min(90vw,40rem)]">
      <ProgressRow {...args} />
    </Rows>
  ),
} satisfies Meta<typeof ProgressRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Over: Story = {
  args: {
    primary: <ProgressAmount amount="€512.90" of="of €450.00" />,
    secondary: <p className="text-xs text-destructive tabular-nums">€62.90 over</p>,
    meter: { value: 512.9, max: 450, tone: "negative" },
  },
};

export const LongTitle: Story = {
  args: {
    label: "Emergency fund for the roof, the car and every other surprise the year brings",
    title: "Emergency fund for the roof, the car and every other surprise the year brings",
    titleHint: "Emergency fund for the roof, the car and every other surprise the year brings",
    meter: { value: 4200, max: 10000, tone: "positive" },
  },
};

export const WithoutMeter: Story = {
  args: {
    primary: <Tag tone="neutral">Progress unavailable</Tag>,
    secondary: undefined,
    meter: null,
  },
};

export const Deleting: Story = { args: { deletePending: true, deleteDisabled: true } };
