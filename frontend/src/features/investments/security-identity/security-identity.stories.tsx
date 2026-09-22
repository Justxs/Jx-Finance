import type { Meta, StoryObj } from "@storybook/react-vite";
import { usStock, worldEtf } from "@/storybook/fixtures/investments";
import { PriceWithDate } from "./price-with-date";
import { SecurityIdentity } from "./security-identity";

const meta = {
  title: "Investments/SecurityIdentity",
  component: SecurityIdentity,
  args: { security: worldEtf, meta: worldEtf.name, detail: "Brokerage" },
} satisfies Meta<typeof SecurityIdentity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSuffix: Story = {
  args: {
    security: usStock,
    meta: usStock.name,
    detail: null,
    wrap: true,
    suffix: <span className="text-xs text-muted-foreground">{usStock.currency.toUpperCase()}</span>,
  },
};

export const WithPrice: Story = {
  render: (args) => (
    <div className="flex items-center gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <SecurityIdentity {...args} />
      </div>
      <div className="shrink-0 text-right">
        <PriceWithDate
          price={Number(worldEtf.lastPrice)}
          currency={worldEtf.currency}
          date={worldEtf.lastPriceDate}
        />
      </div>
    </div>
  ),
};
