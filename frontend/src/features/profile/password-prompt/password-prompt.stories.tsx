import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { PasswordPrompt } from "./password-prompt";

const meta = {
  title: "Features/Profile/PasswordPrompt",
  component: PasswordPrompt,
  args: {
    id: "story-password",
    submitLabel: "Add a passkey",
    pending: false,
    error: null,
    onSubmit: fn(() => Promise.resolve()),
  },
  decorators: [withWidth("column")],
} satisfies Meta<typeof PasswordPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = {
  args: { submitLabel: "Disable two-factor authentication", variant: "destructive" },
};

export const Pending: Story = { args: { pending: true } };

export const WithMessage: Story = {
  args: { message: "This authenticator already holds a passkey for your account." },
};

export const SubmitsAndClearsThePassword: Story = {
  play: async ({ args, canvas }) => {
    const field = canvas.getByLabelText("Current password");
    await expect(canvas.getByRole("button", { name: "Add a passkey" })).toBeDisabled();

    await fireEvent.change(field, { target: { value: "correct horse" } });
    await userEvent.click(canvas.getByRole("button", { name: "Add a passkey" }));

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith("correct horse"));
    await waitFor(() => expect(field).toHaveValue(""));
  },
};
