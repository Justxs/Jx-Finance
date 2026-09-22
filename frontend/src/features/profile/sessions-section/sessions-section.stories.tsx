import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getRevokeOtherSessionsMockHandler,
  getRevokeSessionMockHandler,
  getSessionsMockHandler,
} from "@/api/generated/auth/auth.msw";
import type { SessionResponse } from "@/api/generated/model";
import { serverErrorProblem, sessions } from "@/storybook/fixtures";
import {
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { SessionsSection } from "./sessions-section";

const meta = {
  title: "Features/Profile/SessionsSection",
  component: SessionsSection,
  parameters: { layout: "padded", route: "/profile" },
} satisfies Meta<typeof SessionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function revocableHandlers() {
  let live: SessionResponse[] = sessions;
  return [
    getSessionsMockHandler(() => live),
    getRevokeSessionMockHandler(({ params }) => {
      live = live.filter((session) => session.id !== params.id);
    }),
    getRevokeOtherSessionsMockHandler(() => {
      live = live.filter((session) => session.isCurrent);
    }),
    ...handlers,
  ];
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Chrome 140 on Windows")).toBeVisible();
    await expect(canvas.getByText("This browser")).toBeVisible();
    await expect(canvas.getByText("Safari 18 on iOS")).toBeVisible();
    await expect(canvas.getByText("Firefox 143 on Linux")).toBeVisible();
    await expect(canvas.getByText("Unknown browser")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^Sign out:/u })).toHaveLength(3);
    await expect(
      canvas.queryByRole("button", { name: "Sign out: Chrome 140 on Windows" }),
    ).toBeNull();
    await expect(canvas.getByRole("button", { name: "Sign out everywhere else" })).toBeEnabled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Ši naršyklė")).toBeVisible();
    await expect(canvas.getByText("Chrome 140, Windows")).toBeVisible();
  },
};

export const OnlyCurrentSession: Story = {
  parameters: withHandlers(getSessionsMockHandler(sessions.filter((session) => session.isCurrent))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("This browser")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /^Sign out:/u })).toBeNull();
    await expect(canvas.getByRole("button", { name: "Sign out everywhere else" })).toBeDisabled();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const RevokeAsksFirstThenRemovesTheRow: Story = {
  parameters: { msw: { handlers: revocableHandlers() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Sign out: Safari 18 on iOS" }),
    );
    const dialog = within(await openedDialog("alertdialog"));
    await expect(dialog.getByText("Sign this browser out?")).toBeVisible();
    await expect(dialog.getByText("Safari 18 on iOS")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Sign out" }));

    await expect(await screen.findByText("Browser signed out")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("Safari 18 on iOS")).toBeNull());
    await expect(canvas.getByText("Firefox 143 on Linux")).toBeVisible();
  },
};

export const SignOutEverywhereElse: Story = {
  parameters: { msw: { handlers: revocableHandlers() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Sign out everywhere else" }));
    const dialog = within(await openedDialog("alertdialog"));
    await expect(dialog.getByText("Sign out everywhere else?")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Sign out everywhere else" }));

    await expect(await screen.findByText("Signed out everywhere else")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByRole("button", { name: /^Sign out:/u })).toBeNull());
    await expect(canvas.getByText("Chrome 140 on Windows")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Sign out everywhere else" })).toBeDisabled();
  },
};

export const RevokeFailed: Story = {
  parameters: withHandlers(
    getRevokeSessionMockHandler(
      failWith({ ...serverErrorProblem, instance: "/api/auth/sessions" }, 500),
    ),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Sign out: Firefox 143 on Linux" }),
    );
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Sign out" }));

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Sign out: Firefox 143 on Linux" })).toBeEnabled(),
    );
    await expect(canvas.getByText("Firefox 143 on Linux")).toBeVisible();
  },
};
