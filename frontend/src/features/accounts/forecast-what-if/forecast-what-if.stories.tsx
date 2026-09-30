import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { ForecastWhatIf } from "./forecast-what-if";

const meta = {
  title: "Features/Accounts/ForecastWhatIf",
  component: ForecastWhatIf,
  args: {
    accountId: "account",
    accountName: "Swedbank einamoji",
    currency: "eur",
    today: "2026-09-18",
    whatIf: null,
    onChange: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof ForecastWhatIf>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Shown: Story = {
  args: { whatIf: { accountId: "account", amount: -1400, date: "2026-10-03" } },
};

export const SendsANegativeAmount: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByText("Try a payment"));
    const submit = canvas.getByRole("button", { name: "Show in forecast" });
    await expect(submit).toBeDisabled();
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "1400,50");
    await userEvent.click(submit);
    await expect(args.onChange).toHaveBeenCalledWith({
      accountId: "account",
      amount: -1400.5,
      date: "2026-09-18",
    });
  },
};
