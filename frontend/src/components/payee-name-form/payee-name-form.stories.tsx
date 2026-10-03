import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getSetPayeeNameMockHandler } from "@/api/generated/payees/payees.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { PayeeNameForm } from "./payee-name-form";

const meta = {
  title: "Components/PayeeNameForm",
  component: PayeeNameForm,
  args: { payee: "MAXIMA X, Ukmergės g. 1234", onClose: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PayeeNameForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Renaming: Story = { args: { initialName: "Maxima" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Saving: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(/MAXIMA X, Ukmergės g\. 1234/u)).toBeVisible();
    await fireEvent.change(canvas.getByRole("textbox", { name: "Name" }), {
      target: { value: "  Maxima  " },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
  },
};

export const EmptyNameIsRefused: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true"),
    );
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const SubmitPending: Story = {
  args: { initialName: "Maxima" },
  parameters: withHandlers(getSetPayeeNameMockHandler(pending)),
};

export const ServerError: Story = {
  args: { initialName: "Maxima" },
  parameters: withHandlers(getSetPayeeNameMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
