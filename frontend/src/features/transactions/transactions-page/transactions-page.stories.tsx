import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { TransactionsPage } from "./transactions-page";

async function neverResolve() {
  await delay("infinite");
  return new HttpResponse(null, { status: 204 });
}

const meta = {
  title: "Features/Transactions/TransactionsPage",
  component: TransactionsPage,
  parameters: { layout: "fullscreen", route: "/transactions" },
  render: () => (
    <div className="mx-auto max-w-6xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <TransactionsPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TransactionsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondPage: Story = { parameters: { route: "/transactions?page=2" } };

export const FilteredExpenses: Story = {
  parameters: { route: "/transactions?type=expense&sort=amount&direction=desc" },
};

export const FilteredByDateRange: Story = {
  parameters: { route: "/transactions?dateFrom=2026-09-01&dateTo=2026-09-07" },
};

export const NoSearchMatches: Story = {
  parameters: { route: "/transactions?search=does-not-exist" },
};

export const AddDialogFromUrl: Story = { parameters: { route: "/transactions?new=true" } };

export const SaveAndAddAnother: Story = {
  parameters: { route: "/transactions?new=true" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = within(await page.findByRole("dialog"));
    const amount = await dialog.findByLabelText("Amount");
    fireEvent.change(amount, { target: { value: "12,50" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save and add another" }));
    await waitFor(() => expect(amount).toHaveValue(""));
    await expect(page.getByRole("dialog")).not.toHaveAttribute("data-closed");
    await waitFor(() => expect(amount).toHaveFocus());
  },
};

export const BulkSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const boxes = await canvas.findAllByRole("checkbox", { name: /^Select: / });
    const enabled = boxes.filter((box) => box.getAttribute("aria-disabled") !== "true");
    await userEvent.click(enabled[0]!);
    await userEvent.click(enabled[1]!);
    await expect(enabled[1]).toHaveFocus();
    await expect(await canvas.findByText("2 selected")).toBeVisible();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: { msw: { handlers: [http.post("*/api/transactions", neverResolve), ...handlers] } },
};
