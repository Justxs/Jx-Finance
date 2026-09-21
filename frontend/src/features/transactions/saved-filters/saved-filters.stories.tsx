import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { readSavedFilters, saveFilter } from "@/stores/transaction-views";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, tags } from "@/storybook/fixtures";
import { SavedFilters } from "./saved-filters";

const meta = {
  title: "Features/Transactions/SavedFilters",
  component: SavedFilters,
  args: { accounts, categories, tags },
  parameters: { route: "/transactions" },
  decorators: [withWidth("w-72")],
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
    const body = within(document.body);

    await expect(await body.findByText("Names something that no longer exists")).toBeVisible();
    await expect(
      body.getByRole("button", { name: "Apply saved filter: Renovation" }),
    ).toBeEnabled();
  },
};

export const SavingTheCurrentFilter: Story = {
  args: { defaultOpen: true },
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async () => {
    const body = within(document.body);

    await userEvent.type(await body.findByRole("textbox", { name: "Save filter" }), "September");
    await userEvent.click(body.getByRole("button", { name: "Save filter" }));

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
    const body = within(document.body);

    await expect(
      await body.findByText("Filter the list first; sorting and the page number are not saved."),
    ).toBeVisible();
  },
};
