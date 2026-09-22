import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getArchivedAccountsMockHandler,
  getRestoreAccountMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import type { ArchivedAccountResponse } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { archivedAccounts, checkingAccount, serverErrorProblem } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { ArchivedAccounts } from "./archived-accounts";

const meta = {
  title: "Features/Accounts/ArchivedAccounts",
  component: ArchivedAccounts,
  parameters: { layout: "padded", route: "/accounts" },
  render: () => (
    <QueryBoundary fallback={<Skeleton className="h-8 w-48" />}>
      <ArchivedAccounts />
    </QueryBoundary>
  ),
} satisfies Meta<typeof ArchivedAccounts>;

export default meta;
type Story = StoryObj<typeof meta>;

function restorableHandlers() {
  let live: ArchivedAccountResponse[] = archivedAccounts;
  return [
    getArchivedAccountsMockHandler(() => live),
    getRestoreAccountMockHandler(({ params }) => {
      live = live.filter((account) => account.id !== params.id);
      return { ...checkingAccount, id: String(params.id) };
    }),
    ...handlers,
  ];
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = await canvas.findByText("Archived accounts (2)");
    await userEvent.click(summary);

    await expect(await canvas.findByText("Senoji SEB kortelė")).toBeVisible();
    await expect(canvas.getByText("Sodo išlaidos")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^Restore:/u })).toHaveLength(1);
    await expect(canvas.getByText("Only its owner can restore it")).toBeVisible();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Archyvuotos sąskaitos (2)"));
    await expect(canvas.getByRole("button", { name: "Atkurti: Senoji SEB kortelė" })).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="skeleton"]')).toBeNull());
    await expect(canvas.queryByText(/Archived accounts/u)).toBeNull();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const RestoringTakesTheRowOut: Story = {
  parameters: { msw: { handlers: restorableHandlers() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Archived accounts (2)"));
    await userEvent.click(canvas.getByRole("button", { name: "Restore: Senoji SEB kortelė" }));

    await expect(await screen.findByText("Account restored")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("Senoji SEB kortelė")).toBeNull());
    await expect(canvas.getByText("Archived accounts (1)")).toBeVisible();
  },
};

export const RestoreRefused: Story = {
  parameters: withHandlers(
    getRestoreAccountMockHandler(
      failWith(
        {
          ...serverErrorProblem,
          status: 403,
          title: "Forbidden",
          instance: "/api/accounts/33333333-0000-4000-8000-000000000006/restore",
          errors: [
            {
              name: "GeneralErrors",
              reason: "Only the owner can restore an account.",
              code: "access.forbidden" as const,
            },
          ],
        },
        403,
      ),
    ),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Archived accounts (2)"));
    await userEvent.click(canvas.getByRole("button", { name: "Restore: Senoji SEB kortelė" }));

    await expect(
      await screen.findByText("You do not have permission to do this."),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Restore: Senoji SEB kortelė" })).toBeEnabled();
  },
};
