import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  getDisableTwoFactorMockHandler,
  getMeMockHandler,
  getSetupTwoFactorMockHandler,
} from "@/api/generated/auth/auth.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentUserWithTwoFactor,
  serverErrorProblem,
  validationProblem,
} from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
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
  parameters: {
    msw: {
      handlers: [getMeMockHandler(currentUserWithTwoFactor), ...handlers],
    },
  },
};

export const WrongPasswordOnEnable: Story = {
  parameters: {
    msw: {
      handlers: [
        getSetupTwoFactorMockHandler(
          failWith({ ...validationProblem, detail: "Current password is incorrect." }, 400),
        ),
        ...handlers,
      ],
    },
  },
};

export const WrongPasswordOnDisable: Story = {
  parameters: {
    msw: {
      handlers: [
        getMeMockHandler(currentUserWithTwoFactor),
        getDisableTwoFactorMockHandler(
          failWith({ ...validationProblem, detail: "Current password is incorrect." }, 400),
        ),
        ...handlers,
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [getMeMockHandler(pending), ...handlers],
    },
  },
};

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        getMeMockHandler(failWith({ ...serverErrorProblem, instance: "/api/auth/me" }, 500)),
        ...handlers,
      ],
    },
  },
};
