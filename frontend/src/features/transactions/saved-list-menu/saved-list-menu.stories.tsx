import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark } from "lucide-react";
import { expect, fn, screen, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { SavedListMenu } from "./saved-list-menu";

const items = [
  { id: "1", name: "Groceries this month" },
  { id: "2", name: "Renovation", note: "Names something that no longer exists" },
];

const meta = {
  title: "Features/Transactions/SavedListMenu",
  component: SavedListMenu,
  args: {
    icon: Bookmark,
    label: "Saved filters",
    items,
    emptyText: "No saved filters yet.",
    applyHint: "Apply saved filter",
    saveLabel: "Save filter",
    savePlaceholder: "e.g. Groceries this month",
    saveHint: "Filter the list first.",
    canSave: true,
    onSave: fn(),
    onApply: fn(),
    onRename: fn(),
    onDelete: fn(),
  },
  decorators: [withWidth("w-72")],
} satisfies Meta<typeof SavedListMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Empty: Story = { args: { defaultOpen: true, items: [], canSave: false } };

export const WithoutSaving: Story = {
  args: { defaultOpen: true, onSave: undefined, label: "Templates" },
};

export const Applying: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply saved filter: Groceries this month" }),
    );

    await expect(args.onApply).toHaveBeenCalledWith("1");
  },
};

export const Renaming: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole("button", { name: "Rename: Renovation" }));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Kitchen");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await expect(args.onRename).toHaveBeenCalledWith("2", "Kitchen");
  },
};

export const Saving: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    await userEvent.type(await screen.findByRole("textbox", { name: "Save filter" }), "September");
    await userEvent.click(screen.getByRole("button", { name: "Save filter" }));

    await expect(args.onSave).toHaveBeenCalledWith("September");
  },
};

export const RenamingWithEnter: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole("button", { name: "Rename: Renovation" }));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Kitchen{Enter}");

    await expect(args.onRename).toHaveBeenCalledWith("2", "Kitchen");
  },
};

export const NothingToSave: Story = {
  args: { defaultOpen: true, canSave: false },
  play: async () => {
    await expect(await screen.findByText("Filter the list first.")).toBeVisible();
    await expect(screen.getByRole("button", { name: "Save filter" })).toBeDisabled();
  },
};
