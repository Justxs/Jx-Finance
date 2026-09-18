import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentUserWithTwoFactor,
  serverErrorProblem,
  unauthorizedProblem,
  validationProblem,
} from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
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
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json(currentUserWithTwoFactor)),
        ...handlers,
      ],
    },
  },
};

export const WrongPasswordOnEnable: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/2fa/setup", () =>
          HttpResponse.json(
            { ...validationProblem, detail: "Current password is incorrect." },
            { status: 400, headers: { "Content-Type": "application/problem+json" } },
          ),
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
        http.get("*/api/auth/me", () => HttpResponse.json(currentUserWithTwoFactor)),
        http.post("*/api/auth/2fa/disable", () =>
          HttpResponse.json(
            { ...validationProblem, detail: "Current password is incorrect." },
            { status: 400, headers: { "Content-Type": "application/problem+json" } },
          ),
        ),
        ...handlers,
      ],
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
