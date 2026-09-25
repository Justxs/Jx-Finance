import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateAssetMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { pending, withHandlers } from "@/storybook/handlers";
import { AssetForm } from "./asset-form";

const meta = {
  title: "Features/NetWorth/AssetForm",
  component: AssetForm,
  args: { onClose: fn() },
  decorators: [withWidth("w-[min(36rem,calc(100vw-3rem))]")],
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
  parameters: withHandlers(getCreateAssetMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await fireEvent.change(fields[0]!, {
      target: { value: "Three-room apartment in Zirmunai, 68 square metres" },
    });
    await fireEvent.change(fields[1]!, { target: { value: "145000.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};
