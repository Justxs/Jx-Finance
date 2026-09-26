import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  currentUserWithTwoFactor,
  longNameUser,
  serverErrorProblem,
  unauthorizedProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ProfilePage } from "./profile-page";

const meta = {
  title: "Features/Profile/ProfilePage",
  component: ProfilePage,
  parameters: { layout: "fullscreen", route: "/profile" },
  decorators: [withPageFrame],
} satisfies Meta<typeof ProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoFactorEnabled: Story = {
  parameters: withHandlers(getMeMockHandler(currentUserWithTwoFactor)),
};

export const LongDisplayName: Story = {
  parameters: withHandlers(getMeMockHandler(longNameUser)),
};

export const Loading: Story = {
  parameters: withHandlers(getMeMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(
    getMeMockHandler(failWith({ ...serverErrorProblem, instance: "/api/auth/me" })),
  ),
};

export const Unauthenticated: Story = {
  parameters: withHandlers(getMeMockHandler(failWith(unauthorizedProblem))),
};

export const SavesDisplayName: Story = {
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(/display name|rodomas vardas/i), {
      target: { value: "Rūta K." },
    });
    await userEvent.click(
      canvas.getByRole("button", { name: /save changes|išsaugoti pakeitimus/i }),
    );

    await expect(
      await screen.findByText(/profile updated|profilis atnaujintas/i),
    ).toBeInTheDocument();
  },
};

export const SwitchesToSecurity: Story = {
  play: async ({ canvas }) => {
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
