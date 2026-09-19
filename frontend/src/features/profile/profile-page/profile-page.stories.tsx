import type { Meta, StoryObj } from "@storybook/react-vite";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { currentUserWithTwoFactor, longNameUser, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, handlers, pending, unauthenticatedHandlers } from "@/storybook/handlers";
import { ProfilePage } from "./profile-page";

const meta = {
  title: "Features/Profile/ProfilePage",
  component: ProfilePage,
  parameters: { layout: "fullscreen", route: "/profile" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full max-w-md" />}>
        <ProfilePage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoFactorEnabled: Story = {
  parameters: {
    msw: {
      handlers: [getMeMockHandler(currentUserWithTwoFactor), ...handlers],
    },
  },
};

export const LongDisplayName: Story = {
  parameters: {
    msw: {
      handlers: [getMeMockHandler(longNameUser), ...handlers],
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

export const Unauthenticated: Story = {
  parameters: { msw: { handlers: unauthenticatedHandlers } },
};
