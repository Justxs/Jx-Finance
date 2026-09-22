import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { ShareRow } from "./share-row";

const meta = {
  title: "Components/ShareRow",
  component: ShareRow,
  decorators: [withWidth("w-[min(28rem,90vw)]")],
  args: {
    name: <span className="min-w-0 flex-1 wrap-break-word">Groceries</span>,
    share: "42%",
    amount: "€312.40",
    value: 312.4,
    max: 450,
  },
  render: (args) => (
    <ul>
      <ShareRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof ShareRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WideAmount: Story = { args: { amount: "€1,234,567.89", wideAmount: true } };

export const WithNote: Story = {
  args: {
    note: (
      <span className="shrink-0 text-right text-xs text-destructive tabular-nums">€62.90 over</span>
    ),
    value: 512.9,
    tone: "negative",
    meterLabel: "Groceries",
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">was €280.00</p>
    ),
  },
};
