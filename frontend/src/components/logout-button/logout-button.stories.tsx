import type { Meta, StoryObj } from "@storybook/react-vite";
import { getLogoutMockHandler } from "@/api/generated/auth/auth.msw";
import { failWithStatus, handlers, pending } from "@/storybook/handlers";
import { LogoutButton } from "./logout-button";

const meta = {
  title: "Components/LogoutButton",
  component: LogoutButton,
} satisfies Meta<typeof LogoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PendingAfterClick: Story = {
  parameters: {
    msw: {
      handlers: [getLogoutMockHandler(pending), ...handlers],
    },
  },
};

export const FailsAfterClick: Story = {
  parameters: {
    msw: {
      handlers: [getLogoutMockHandler(failWithStatus(500)), ...handlers],
    },
  },
};
