import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getDeleteBudgetMockHandler,
  getGetBudgetsMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { RoutePending } from "@/components/route-pending";
import { budgets, ids, overLimitBudget, cycle } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { BudgetsPage } from "./budgets-page";

function BudgetsPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <BudgetsPage />
      </QueryBoundary>
    </div>
  );
}

const manyBudgets = Array.from({ length: 14 }, (_, index) => ({
  ...cycle(budgets, index),
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  categoryName:
    index % 3 === 0
      ? `Household goods, repairs, garden maintenance and everything else that never fits anywhere ${index + 1}`
      : `Category ${index + 1}`,
}));

const meta = {
  title: "Features/Budgets/BudgetsPage",
  component: BudgetsPage,
  parameters: { layout: "fullscreen", route: "/budgets" },
  render: () => <BudgetsPageStory />,
} satisfies Meta<typeof BudgetsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/spent this month|išleista šį mėnesį/i)).toBeVisible();
    await expect(canvas.getByText(/^(budgeted|suplanuota)$/i)).toBeVisible();
    const links = canvas.getAllByRole("link");
    await expect(links[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/\/transactions\?.*categoryId=.*type=expense.*dateFrom=/),
    );
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/no budgets yet|biudžetų dar nėra/i);
    await expect(canvas.queryByText(/spent this month|išleista šį mėnesį/i)).toBeNull();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const AllOverLimit: Story = {
  parameters: {
    msw: {
      handlers: [
        getGetBudgetsMockHandler([
          overLimitBudget,
          {
            ...overLimitBudget,
            id: ids.budgets.transport,
            categoryName: "Transportas",
            limitAmount: "10.00",
            spent: "98.40",
            remaining: "-88.40",
          },
        ]),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = await canvas.findByText(/^(over by|viršyta)$/i);
    await expect(label.nextElementSibling).toHaveClass("text-expense");
  },
};

export const ZeroLimit: Story = {
  parameters: {
    msw: {
      handlers: [
        getGetBudgetsMockHandler([
          { ...overLimitBudget, limitAmount: "0.00", spent: "0.00", remaining: "0.00" },
        ]),
        ...handlers,
      ],
    },
  },
};

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [getGetBudgetsMockHandler(manyBudgets), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add budget|pridėti/i }));
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
  },
};

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButtons = await canvas.findAllByRole("button", { name: /^(edit|redaguoti):/i });
    await userEvent.click(editButtons[0]!);
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteBudgetMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti):/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
