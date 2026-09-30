import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark } from "lucide-react";
import { expect, fn, screen, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import type { Canvas } from "@/storybook/interactions";
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
  decorators: [withWidth("field")],
} satisfies Meta<typeof SavedListMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openMenu(canvas: Canvas, name: string | RegExp = /^Saved filters/) {
  await userEvent.click(canvas.getByRole("button", { name }));
}

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const Empty: Story = {
  args: { items: [], canSave: false },
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const WithoutSaving: Story = {
  args: { onSave: undefined, label: "Templates" },
  play: async ({ canvas }) => {
    await openMenu(canvas, /^Templates/);
  },
};

export const Applying: Story = {
  play: async ({ args, canvas }) => {
    await openMenu(canvas);
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply saved filter: Groceries this month" }),
    );

    await expect(args.onApply).toHaveBeenCalledWith("1");
  },
};

export const Renaming: Story = {
  play: async ({ args, canvas }) => {
    await openMenu(canvas);
    await userEvent.click(await screen.findByRole("button", { name: "Rename: Renovation" }));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Kitchen");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await expect(args.onRename).toHaveBeenCalledWith("2", "Kitchen");
  },
};

export const Saving: Story = {
  play: async ({ args, canvas }) => {
    await openMenu(canvas);
    await userEvent.type(await screen.findByRole("textbox", { name: "Save filter" }), "September");
    await userEvent.click(screen.getByRole("button", { name: "Save filter" }));

    await expect(args.onSave).toHaveBeenCalledWith("September");
  },
};

export const RenamingWithEnter: Story = {
  play: async ({ args, canvas }) => {
    await openMenu(canvas);
    await userEvent.click(await screen.findByRole("button", { name: "Rename: Renovation" }));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Kitchen{Enter}");

    await expect(args.onRename).toHaveBeenCalledWith("2", "Kitchen");
  },
};

export const NothingToSave: Story = {
  args: { canSave: false },
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await expect(await screen.findByText("Filter the list first.")).toBeVisible();
    await expect(screen.getByRole("button", { name: "Save filter" })).toBeDisabled();
  },
};
