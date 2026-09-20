import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { ShareBars } from "./share-bars";

const meta = {
  title: "Components/ShareBars",
  component: ShareBars,
  decorators: [withWidth("w-[min(28rem,90vw)]")],
  args: {
    rows: [
      { id: "broker", name: "Interactive Brokers", amount: 15987.62 },
      { id: "savings", name: "Taupomoji sąskaita", amount: 12500 },
      {
        id: "shared",
        name: "Bendra šeimos sąskaita kasdienėms išlaidoms ir komunaliniams mokesčiams",
        amount: 1620.4,
      },
      { id: "cash", name: "Grynieji", amount: 185.5 },
    ],
  },
} satisfies Meta<typeof ShareBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithNegative: Story = {
  args: {
    rows: [
      { id: "checking", name: "Swedbank einamoji", amount: 2843.17 },
      { id: "card", name: "Kredito kortelė", amount: -412.3 },
    ],
  },
};

export const WithDetail: Story = {
  args: {
    rows: [
      { id: "vwce", name: "VWCE", detail: "Vanguard FTSE All-World", amount: 11240.1 },
      { id: "eunl", name: "EUNL", detail: "iShares Core MSCI World", amount: 4747.52 },
    ],
  },
};
