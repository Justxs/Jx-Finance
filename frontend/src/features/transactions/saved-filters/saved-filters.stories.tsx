import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { savedFilters } from "@/features/transactions/transaction-views";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, tags } from "@/storybook/fixtures";
import type { Canvas } from "@/storybook/interactions";
import { SavedFilters } from "./saved-filters";

function SavedFiltersHarness() {
  const filters = useTransactionFilters({ accounts, categories });
  return <SavedFilters filters={filters} accounts={accounts} categories={categories} tags={tags} />;
}

const meta = {
  title: "Features/Transactions/SavedFilters",
  component: SavedFiltersHarness,
  parameters: { route: "/transactions" },
  decorators: [withWidth("field")],
} satisfies Meta<typeof SavedFiltersHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openMenu(canvas: Canvas) {
  await userEvent.click(await canvas.findByRole("button", { name: /^Saved filters/ }));
}

export const Closed: Story = {};

export const Empty: Story = {
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const WithSavedFilters: Story = {
  beforeEach: () => {
    savedFilters.save("Groceries this month", { filter: { search: "lidl", type: "expense" } });
  },
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const NamesADeletedCategory: Story = {
  beforeEach: () => {
    savedFilters.save("Renovation", {
      filter: { categoryId: "44444444-0000-4000-8000-000000000099" },
    });
  },
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await expect(await screen.findByText("Names something that no longer exists")).toBeVisible();
    await expect(
      screen.getByRole("button", { name: "Apply saved filter: Renovation" }),
    ).toBeEnabled();
  },
};

export const SavingTheCurrentFilter: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await userEvent.type(await screen.findByRole("textbox", { name: "Save filter" }), "September");
    await userEvent.click(screen.getByRole("button", { name: "Save filter" }));

    await expect(savedFilters.read().map((row) => row.name)).toEqual(["September"]);
    await expect(savedFilters.read()[0]?.filter).toEqual({ search: "lidl", type: "expense" });
  },
};

export const NothingToSave: Story = {
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await expect(
      await screen.findByText("Filter the list first; sorting and the page number are not saved."),
    ).toBeVisible();
  },
};
