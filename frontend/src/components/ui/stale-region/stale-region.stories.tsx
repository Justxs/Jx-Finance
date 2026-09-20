import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Rows } from "../rows/rows";
import { StaleRegion } from "./stale-region";

const meta = {
  title: "UI/StaleRegion",
  component: StaleRegion,
  args: { stale: false },
  render: (args) => (
    <StaleRegion {...args} className="w-80">
      <Rows aria-label="Transactions">
        <li className="flex justify-between py-2 text-sm">
          <span>Groceries</span>
          <span className="text-expense tabular-nums">−42,10 €</span>
        </li>
        <li className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Salary</span>
          <span className="text-income tabular-nums">+2 100,00 €</span>
        </li>
      </Rows>
    </StaleRegion>
  ),
} satisfies Meta<typeof StaleRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fresh: Story = {};

export const Stale: Story = {
  args: { stale: true },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole("list", { name: "Transactions" });
    const region = list.parentElement;
    await expect(region).toHaveAttribute("aria-busy", "true");
    await expect(getComputedStyle(list).opacity).toBe("1");
  },
};
