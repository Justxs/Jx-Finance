import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateDebtMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { handlers, pending } from "@/storybook/handlers";
import { DebtForm } from "./debt-form";

const meta = {
  title: "Features/NetWorth/DebtForm",
  component: DebtForm,
  args: { onCreated: fn(), onCancel: fn() },
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(36rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof DebtForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Mortgage (Swedbank)");
    await userEvent.type(fields[1]!, "98450.32");
    await userEvent.type(fields[2]!, "3.85");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "x");
    await userEvent.clear(fields[0]!);
    await userEvent.type(fields[1]!, "abc");
  },
};

export const SubmitPending: Story = {
  parameters: {
    msw: {
      handlers: [getCreateDebtMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    fireEvent.change(fields[0]!, { target: { value: "Mortgage (Swedbank)" } });
    fireEvent.change(fields[1]!, { target: { value: "98450.32" } });
    fireEvent.change(fields[2]!, { target: { value: "3.85" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};
