import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getCreateAssetMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { assets } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { AssetForm } from "./asset-form";

const car = assets[1]!;

const meta = {
  title: "Features/NetWorth/AssetForm",
  component: AssetForm,
  args: { onClose: fn() },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof AssetForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Three-room apartment in Zirmunai, 68 square metres");
    await userEvent.type(fields[1]!, "145000.00");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "x");
    await userEvent.clear(fields[0]!);
    await userEvent.type(fields[1]!, "12,3,4");
  },
};

export const WithDepreciation: Story = {
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Toyota Corolla 2021");
    await userEvent.type(fields[1]!, "18000.00");
    await userEvent.click(canvas.getByRole("checkbox", { name: /loses value/i }));
    await userEvent.type(canvas.getByLabelText(/useful life, years/i), "8");
    await userEvent.type(canvas.getByLabelText(/residual value/i), "3000");
    await expect(await canvas.findByText(/loses .*156\.25.* a month/i)).toBeVisible();
  },
};

export const EditingDepreciation: Story = {
  args: { editing: car },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateAssetMockHandler(pending)),
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await fireEvent.change(fields[0]!, {
      target: { value: "Three-room apartment in Zirmunai, 68 square metres" },
    });
    await fireEvent.change(fields[1]!, { target: { value: "145000.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};

export const DepreciationServerError: Story = {
  parameters: withHandlers(
    getCreateAssetMockHandler(
      failWith({
        status: 400,
        title: "One or more validation errors occurred.",
        errors: [{ name: "depreciation.lifeMonths", reason: "Useful life is out of range." }],
      }),
    ),
  ),
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Toyota Corolla 2021");
    await userEvent.type(fields[1]!, "18000.00");
    await userEvent.click(canvas.getByRole("checkbox", { name: /loses value/i }));
    const life = canvas.getByLabelText(/useful life, years/i);
    await userEvent.type(life, "8");
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
    await waitFor(() => expect(life).toHaveAttribute("aria-invalid", "true"));
    await expect(canvas.getByText("Useful life is out of range.")).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};
