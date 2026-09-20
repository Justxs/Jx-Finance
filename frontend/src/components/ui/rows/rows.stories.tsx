import type { Meta, StoryObj } from "@storybook/react-vite";
import { Rows } from "./rows";

const meta = {
  title: "UI/Rows",
  component: Rows,
} satisfies Meta<typeof Rows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Rows aria-label="Accounts" className="w-80">
      <li className="flex justify-between py-2 text-sm">
        <span>Everyday account</span>
        <span className="tabular-nums">1 240,50 €</span>
      </li>
      <li className="flex justify-between py-2 text-sm">
        <span>Savings</span>
        <span className="tabular-nums">8 300,00 €</span>
      </li>
      <li className="flex justify-between py-2 text-sm">
        <span>Cash</span>
        <span className="tabular-nums">60,00 €</span>
      </li>
    </Rows>
  ),
};
