import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { getSetSecurityPriceMockHandler } from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem, unpricedStock, usStock } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { PriceForm } from "./price-form";

const meta = {
  title: "Features/Investments/PriceForm",
  component: PriceForm,
  args: { security: usStock, onClose: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PriceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstPrice: Story = { args: { security: unpricedStock } };

export const Saves: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const Pending: Story = {
  parameters: withHandlers(getSetSecurityPriceMockHandler(pending)),
  play: async ({ canvas }) => {
    const submit = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
  },
};

export const ServerError: Story = {
  parameters: withHandlers(getSetSecurityPriceMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
