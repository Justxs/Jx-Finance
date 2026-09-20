import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import {
  getDeleteCategoryMockHandler,
  getCategoriesMockHandler,
} from "@/api/generated/categories/categories.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { RoutePending } from "@/components/route-pending";
import { categories, incomeCategories, cycle } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { CategoriesPage } from "./categories-page";

function CategoriesPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <CategoriesPage />
      </QueryBoundary>
    </div>
  );
}

const manyCategories = Array.from({ length: 40 }, (_, index) => ({
  ...cycle(categories, index),
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

const meta = {
  title: "Features/Categories/CategoriesPage",
  component: CategoriesPage,
  parameters: { layout: "fullscreen", route: "/categories" },
  render: () => <CategoriesPageStory />,
} satisfies Meta<typeof CategoriesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const OnlyIncomeCategories: Story = {
  parameters: {
    msw: {
      handlers: [getCategoriesMockHandler(incomeCategories), ...handlers],
    },
  },
};

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [getCategoriesMockHandler(manyCategories), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /add category|pridėti kategoriją/i }),
    );
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteCategoryMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};

export const DeleteSucceeds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
