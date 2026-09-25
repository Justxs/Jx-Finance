import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { readSavedFilters, saveFilter } from "@/stores/transaction-views";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, tags } from "@/storybook/fixtures";
import { SavedFilters } from "./saved-filters";

const meta = {
  title: "Features/Transactions/SavedFilters",
  component: SavedFilters,
  args: { accounts, categories, tags },
  parameters: { route: "/transactions" },
  decorators: [withWidth("field")],
} satisfies Meta<typeof SavedFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { defaultOpen: true } };

export const WithSavedFilters: Story = {
  args: { defaultOpen: true },
  beforeEach: () => {
    saveFilter("Groceries this month", { search: "lidl", type: "expense" });
  },
};

export const NamesADeletedCategory: Story = {
  args: { defaultOpen: true },
  beforeEach: () => {
    saveFilter("Renovation", { categoryId: "44444444-0000-4000-8000-000000000099" });
  },
  play: async () => {
    await expect(await screen.findByText("Names something that no longer exists")).toBeVisible();
    await expect(
      screen.getByRole("button", { name: "Apply saved filter: Renovation" }),
    ).toBeEnabled();
  },
};

export const SavingTheCurrentFilter: Story = {
  args: { defaultOpen: true },
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async () => {
    await userEvent.type(await screen.findByRole("textbox", { name: "Save filter" }), "September");
    await userEvent.click(screen.getByRole("button", { name: "Save filter" }));

    await expect(readSavedFilters().map((row) => row.name)).toEqual(["September"]);
    await expect(readSavedFilters()[0]?.filter).toEqual({
      search: "lidl",
      type: "expense",
      accountId: undefined,
      categoryId: undefined,
      tagIds: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  },
};

export const NothingToSave: Story = {
  args: { defaultOpen: true },
  play: async () => {
    await expect(
      await screen.findByText("Filter the list first; sorting and the page number are not saved."),
    ).toBeVisible();
  },
};
