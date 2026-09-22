import type { Meta, StoryObj } from "@storybook/react-vite";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { TimelineRow } from "./timeline-row";

const meta = {
  title: "Components/TimelineRow",
  component: TimelineRow,
  args: {
    day: "Sep 24",
    title: "Electricity",
    amount: <span className="shrink-0 text-right font-medium tabular-nums">€64.20</span>,
  },
  render: (args) => (
    <Rows className="w-[min(90vw,28rem)]">
      <TimelineRow {...args} />
    </Rows>
  ),
} satisfies Meta<typeof TimelineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSubtitle: Story = {
  args: { title: "Rimi", subtitle: "Groceries · Swedbank einamoji" },
};

export const WithBadge: Story = {
  args: { badge: <Tag tone="negative">Overdue</Tag> },
};

export const LongTitle: Story = {
  args: {
    title: "Bendra šeimos sąskaita kasdienėms išlaidoms ir komunaliniams mokesčiams",
    subtitle: "Household goods, repairs, garden maintenance and everything else",
  },
};
