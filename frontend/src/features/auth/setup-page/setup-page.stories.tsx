import type { Meta, StoryObj } from "@storybook/react-vite";
import { getSetupMockHandler } from "@/api/generated/setup/setup.msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { SetupPage } from "./setup-page";

const meta = {
  title: "Features/Auth/SetupPage",
  component: SetupPage,
  parameters: { route: "/setup" },
  render: () => (
    <div className="flex w-96 max-w-full justify-center">
      <SetupPage />
    </div>
  ),
} satisfies Meta<typeof SetupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ServerErrorAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [
        getSetupMockHandler(failWith({ ...serverErrorProblem, instance: "/api/setup" }, 500)),
        ...handlers,
      ],
    },
  },
};

export const PendingAfterSubmit: Story = {
  parameters: {
    msw: {
      handlers: [getSetupMockHandler(pending), ...handlers],
    },
  },
};
