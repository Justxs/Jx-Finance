import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getDisableTwoFactorMockHandler,
  getMeMockHandler,
  getSetupTwoFactorMockHandler,
} from "@/api/generated/auth/auth.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import {
  currentUserWithTwoFactor,
  serverErrorProblem,
  validationProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { TwoFactorSettings } from "./two-factor-settings";

const meta = {
  title: "Features/Profile/TwoFactorSettings",
  component: TwoFactorSettings,
  parameters: { route: "/profile" },
  render: () => (
    <div className="w-[28rem] max-w-full">
      <QueryBoundary fallback={<Skeleton className="h-56 w-full" />}>
        <TwoFactorSettings />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TwoFactorSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {};

export const Enabled: Story = {
  parameters: withHandlers(getMeMockHandler(currentUserWithTwoFactor)),
};

export const WrongPasswordOnEnable: Story = {
  parameters: withHandlers(
    getSetupTwoFactorMockHandler(
      failWith({ ...validationProblem, detail: "Current password is incorrect." }),
    ),
  ),
};

export const WrongPasswordOnDisable: Story = {
  parameters: withHandlers(
    getMeMockHandler(currentUserWithTwoFactor),
    getDisableTwoFactorMockHandler(
      failWith({ ...validationProblem, detail: "Current password is incorrect." }),
    ),
  ),
};

export const Loading: Story = {
  parameters: withHandlers(getMeMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(
    getMeMockHandler(failWith({ ...serverErrorProblem, instance: "/api/auth/me" })),
  ),
};
