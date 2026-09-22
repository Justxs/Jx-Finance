import type { Meta, StoryObj } from "@storybook/react-vite";
import { getSetupMockHandler } from "@/api/generated/setup/setup.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { SetupPage } from "./setup-page";

const meta = {
  title: "Features/Auth/SetupPage",
  component: SetupPage,
  parameters: { route: "/setup" },
  decorators: [withWidth("auth")],
} satisfies Meta<typeof SetupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ServerErrorAfterSubmit: Story = {
  parameters: withHandlers(
    getSetupMockHandler(failWith({ ...serverErrorProblem, instance: "/api/setup" }, 500)),
  ),
};

export const PendingAfterSubmit: Story = {
  parameters: withHandlers(getSetupMockHandler(pending)),
};
