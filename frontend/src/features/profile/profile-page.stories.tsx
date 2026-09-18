import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentUserWithTwoFactor,
  longNameUser,
  serverErrorProblem,
  unauthorizedProblem,
} from "@/storybook/fixtures";
import { handlers, unauthenticatedHandlers } from "@/storybook/handlers";
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
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json(currentUserWithTwoFactor)),
        ...handlers,
      ],
    },
  },
};

export const LongDisplayName: Story = {
  parameters: {
    msw: {
      handlers: [http.get("*/api/auth/me", () => HttpResponse.json(longNameUser)), ...handlers],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", async () => {
          await delay("infinite");
          return HttpResponse.json(unauthorizedProblem, { status: 401 });
        }),
        ...handlers,
      ],
    },
  },
};

export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () =>
          HttpResponse.json(
            { ...serverErrorProblem, instance: "/api/auth/me" },
            { status: 500, headers: { "Content-Type": "application/problem+json" } },
          ),
        ),
        ...handlers,
      ],
    },
  },
};

export const Unauthenticated: Story = {
  parameters: { msw: { handlers: unauthenticatedHandlers } },
};
