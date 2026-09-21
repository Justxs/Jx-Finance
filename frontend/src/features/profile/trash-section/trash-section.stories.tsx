import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import type { TrashEntryResponse } from "@/api/generated/model";
import { getRestoreDeletedMockHandler, getTrashMockHandler } from "@/api/generated/trash/trash.msw";
import { serverErrorProblem, trashEntries } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { paginate } from "@/storybook/handlers/lists";
import { TrashSection } from "./trash-section";

const meta = {
  title: "Features/Profile/TrashSection",
  component: TrashSection,
  parameters: { layout: "padded", route: "/profile" },
} satisfies Meta<typeof TrashSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function restorableHandlers() {
  let live: TrashEntryResponse[] = trashEntries;
  return [
    getTrashMockHandler(({ request }) => paginate(live, new URL(request.url).searchParams)),
    getRestoreDeletedMockHandler(async ({ request }) => {
      const body = await readBody(request);
      live = live.filter((entry) => entry.entityId !== body.entityId);
    }),
    ...handlers,
  ];
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Maxima, 42.18 EUR")).toBeVisible();
    await expect(canvas.getAllByText("Transaction")).toHaveLength(1);
    await expect(canvas.getByText("Currency conversion")).toBeVisible();
    await expect(canvas.getByText("Investment entry")).toBeVisible();
    await expect(canvas.getByText("Sell 3 MSFT, 2026-07-15")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^Restore:/u })).toHaveLength(9);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Valiutos keitimas")).toBeVisible();
    await expect(canvas.getByText("Investicijų įrašas")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^Atkurti:/u })).toHaveLength(9);
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("You have not deleted anything in the last 30 days."),
    ).toBeVisible();
  },
};

export const Paged: Story = {
  parameters: {
    msw: {
      handlers: [
        getTrashMockHandler(({ request }) =>
          paginate(
            trashEntries.flatMap((entry, index) =>
              Array.from({ length: 3 }, (_, copy) => ({
                ...entry,
                id: `${entry.id}-${index}-${copy}`,
              })),
            ),
            new URL(request.url).searchParams,
          ),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Page 1 of 3")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(canvas.getByText("Page 2 of 3")).toBeVisible());
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const RestoringTakesTheRowOut: Story = {
  parameters: { msw: { handlers: restorableHandlers() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Restore: Maxima, 42.18 EUR" }),
    );

    await expect(await screen.findByText("Brought back")).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("Maxima, 42.18 EUR")).toBeNull());
    await expect(canvas.getByText("Atostogos Ispanijoje")).toBeVisible();
  },
};

export const RestoreRefused: Story = {
  parameters: {
    msw: {
      handlers: [
        getRestoreDeletedMockHandler(
          failWith(
            {
              ...serverErrorProblem,
              status: 400,
              title: "Cannot restore",
              instance: "/api/trash/restore",
              errors: [
                {
                  name: "GeneralErrors",
                  reason: "The account this belonged to is archived.",
                  code: "restore.referenceMissing" as const,
                },
              ],
            },
            400,
          ),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Restore: Maxima, 42.18 EUR" }),
    );

    await expect(
      await screen.findByText(/The account or category this entry needs is gone/u),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Maxima, 42.18 EUR")).toBeVisible();
  },
};

export const InvestmentRestoreRefused: Story = {
  parameters: {
    msw: {
      handlers: [
        getRestoreDeletedMockHandler(
          failWith(
            {
              ...serverErrorProblem,
              status: 400,
              title: "Cannot restore",
              instance: "/api/trash/restore",
              errors: [
                {
                  name: "GeneralErrors",
                  reason: "Later sales now depend on the shares this entry would take back.",
                  code: "holding.dependentSales" as const,
                },
              ],
            },
            400,
          ),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Restore: Sell 3 MSFT, 2026-07-15" }),
    );

    await expect(await screen.findByText("Later sales depend on this entry.")).toBeInTheDocument();
    await expect(canvas.getByText("Sell 3 MSFT, 2026-07-15")).toBeVisible();
  },
};
