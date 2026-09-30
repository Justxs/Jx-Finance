import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { trackedMortgage } from "@/storybook/fixtures";
import { DebtPayments } from "./debt-payments";

const meta = {
  title: "Features/NetWorth/DebtPayments",
  component: DebtPayments,
  args: { debt: trackedMortgage },
  parameters: { route: "/net-worth/debts/story" },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof DebtPayments>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LinkingPayments: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Link payments" }));
    const body = within(document.body);
    const [first] = await body.findAllByRole("checkbox");
    await userEvent.click(first!);
    await userEvent.click(body.getByRole("button", { name: /link 1 payment/i }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};
