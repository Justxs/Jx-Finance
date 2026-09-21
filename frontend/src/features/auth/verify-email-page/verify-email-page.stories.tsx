import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { resetLink } from "@/storybook/fixtures";
import { VerifyEmailPage } from "./verify-email-page";

const link = `/verify-email?email=${encodeURIComponent(resetLink.email)}&token=${resetLink.token}`;

const meta = {
  title: "Features/Auth/VerifyEmailPage",
  component: VerifyEmailPage,
  parameters: { route: link },
  render: () => (
    <div className="flex w-96 max-w-full justify-center">
      <VerifyEmailPage />
    </div>
  ),
} satisfies Meta<typeof VerifyEmailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(resetLink.email)).toBeInTheDocument();
  },
};

export const ConfirmedAfterClicking: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm this address" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("Your address is confirmed.");
  },
};

export const AStaleLinkIsRefused: Story = {
  parameters: { route: `/verify-email?email=${encodeURIComponent(resetLink.email)}&token=old` },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm this address" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no longer valid/u);
  },
};

export const AnIncompleteLink: Story = {
  parameters: { route: "/verify-email" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/This link is incomplete/u)).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Confirm this address" }),
    ).not.toBeInTheDocument();
  },
};
