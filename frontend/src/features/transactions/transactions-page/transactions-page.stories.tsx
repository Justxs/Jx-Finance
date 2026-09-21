import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { getCreateTransactionMockHandler } from "@/api/generated/transactions/transactions.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import {
  readSavedFilters,
  readTransactionTemplates,
  saveFilter,
  saveTransactionTemplate,
} from "@/stores/transaction-views";
import { ids, splitTransaction } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { TransactionsPage } from "./transactions-page";

const meta = {
  title: "Features/Transactions/TransactionsPage",
  component: TransactionsPage,
  parameters: { layout: "fullscreen", route: "/transactions" },
  render: () => (
    <div className="p-6 lg:p-10">
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
    await fireEvent.change(amount, { target: { value: "12,50" } });
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

export const SavingAndApplyingAFilter: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await userEvent.type(
      await page.findByRole("textbox", { name: "Save filter" }),
      "Lidl expenses",
    );
    await userEvent.click(page.getByRole("button", { name: "Save filter" }));
    await waitFor(() => expect(readSavedFilters()).toHaveLength(1));
    await expect(readSavedFilters()[0]?.filter).toEqual(
      expect.objectContaining({ search: "lidl", type: "expense" }),
    );

    await userEvent.click(await canvas.findByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument(),
    );

    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await userEvent.click(
      await page.findByRole("button", { name: "Apply saved filter: Lidl expenses" }),
    );

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Clear filters" })).toBeVisible(),
    );
  },
};

export const SavedFilterNamingADeletedCategory: Story = {
  beforeEach: () => {
    saveFilter("Renovation", { categoryId: "44444444-0000-4000-8000-000000000099" });
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
    await expect(await page.findByText("Names something that no longer exists")).toBeVisible();

    await userEvent.click(page.getByRole("button", { name: "Apply saved filter: Renovation" }));

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Clear filters" })).toBeVisible(),
    );
    await expect(canvas.getAllByRole("table")[0]).toBeVisible();
  },
};

export const DuplicatingASplitRow: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);

    const duplicate = await canvas.findAllByRole("button", {
      name: `Duplicate: ${splitTransaction.description ?? ""}`,
    });
    await userEvent.click(duplicate[0]!);

    const dialog = within(await page.findByRole("dialog"));
    const amounts = await dialog.findAllByLabelText("Amount");
    await expect(amounts[0]).toHaveValue("128.40");
    await expect(amounts).toHaveLength(4);
    await expect(dialog.getByRole("checkbox", { name: "Split into categories" })).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: "Buto remontas" })).toBeChecked();
  },
};

export const CreatingFromATemplate: Story = {
  beforeEach: () => {
    saveTransactionTemplate("Weekly shop", {
      accountId: ids.accounts.shared,
      categoryId: ids.categories.food,
      type: "expense",
      amount: "42.18",
      currency: "eur",
      description: "Maxima",
      tagIds: [ids.tags.car],
      lines: null,
    });
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: /^Templates/ }));
    await userEvent.click(
      await page.findByRole("button", { name: "New transaction from template: Weekly shop" }),
    );

    const dialog = within(await page.findByRole("dialog"));
    await expect(await dialog.findByLabelText("Amount")).toHaveValue("42.18");
    await expect(dialog.getByLabelText("Description")).toHaveValue("Maxima");
    await expect(dialog.getByRole("checkbox", { name: "Automobilis" })).toBeChecked();
  },
};

export const SavingATemplateFromTheForm: Story = {
  parameters: { route: "/transactions?new=true" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = within(await page.findByRole("dialog"));

    await fireEvent.change(await dialog.findByLabelText("Amount"), { target: { value: "42,18" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save as template" }));
    await userEvent.type(await dialog.findByLabelText("Template name"), "Weekly shop");
    await userEvent.click(dialog.getByRole("button", { name: "Save template" }));

    await waitFor(() =>
      expect(readTransactionTemplates().map((row) => row.name)).toEqual(["Weekly shop"]),
    );
    await expect(readTransactionTemplates()[0]?.values.amount).toBe("42.18");
  },
};

export const TemplateStillValidates: Story = {
  beforeEach: () => {
    saveTransactionTemplate("Empty shape", {
      accountId: ids.accounts.shared,
      categoryId: null,
      type: "expense",
      amount: "",
      currency: "eur",
      description: null,
      tagIds: [],
      lines: null,
    });
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: /^Templates/ }));
    await userEvent.click(
      await page.findByRole("button", { name: "New transaction from template: Empty shape" }),
    );

    const dialog = within(await page.findByRole("dialog"));
    const amount = await dialog.findByLabelText("Amount");
    await expect(amount).toHaveValue("");

    await fireEvent.change(amount, { target: { value: "0" } });
    await waitFor(() => expect(dialog.getByRole("button", { name: "Add" })).toBeDisabled());

    await fireEvent.change(amount, { target: { value: "12,50" } });
    await waitFor(() => expect(dialog.getByRole("button", { name: "Add" })).toBeEnabled());
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: { msw: { handlers: [getCreateTransactionMockHandler(pending), ...handlers] } },
};
