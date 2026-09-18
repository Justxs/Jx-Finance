import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { handlers } from "@/storybook/handlers";
import { AssetForm } from "./asset-form";

const meta = {
  title: "Features/NetWorth/AssetForm",
  component: AssetForm,
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
} satisfies Meta<typeof AssetForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Three-room apartment in Zirmunai, 68 square metres");
    await userEvent.type(fields[1]!, "145000.00");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "x");
    await userEvent.clear(fields[0]!);
    await userEvent.type(fields[1]!, "12,3,4");
  },
};

export const SubmitPending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/assets", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    fireEvent.change(fields[0]!, {
      target: { value: "Three-room apartment in Zirmunai, 68 square metres" },
    });
    fireEvent.change(fields[1]!, { target: { value: "145000.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};
