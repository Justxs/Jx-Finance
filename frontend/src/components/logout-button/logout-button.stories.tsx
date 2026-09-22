import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLogoutMockHandler } from "@/api/generated/auth/auth.msw";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { LogoutButton } from "./logout-button";

const meta = {
  title: "Components/LogoutButton",
  component: LogoutButton,
} satisfies Meta<typeof LogoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PendingAfterClick: Story = {
  parameters: withHandlers(getLogoutMockHandler(pending)),
};

export const FailsAfterClick: Story = {
  parameters: withHandlers(getLogoutMockHandler(failWithStatus(500))),
};
