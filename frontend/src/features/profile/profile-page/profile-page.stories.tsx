import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
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

export const SavesDisplayName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(await canvas.findByLabelText(/display name|rodomas vardas/i), {
      target: { value: "Rūta K." },
    });
    await userEvent.click(
      canvas.getByRole("button", { name: /save changes|išsaugoti pakeitimus/i }),
    );

    await expect(
      await within(document.body).findByText(/profile updated|profilis atnaujintas/i),
    ).toBeInTheDocument();
  },
};

export const SwitchesToSecurity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = await canvas.findByRole("link", {
      name: /two-factor authentication|dvigubas tapatybės patvirtinimas/i,
    });
    await userEvent.click(link);

    await expect(
      await canvas.findByRole("button", {
        name: /enable two-factor authentication|įjungti dvigubą tapatybės patvirtinimą/i,
      }),
    ).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(canvas.queryByLabelText(/display name|rodomas vardas/i)).toBeNull();
  },
};
