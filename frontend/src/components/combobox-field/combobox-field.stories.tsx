import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { namedOptions } from "@/lib/options";
import { categories } from "@/storybook/fixtures";
import { ComboboxField } from "./combobox-field";

function CategoryExample({ initial = "" }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return (
    <div className="w-64">
      <ComboboxField
        aria-label="Category"
        placeholder="Choose a category"
        value={value}
        onChange={setValue}
        options={namedOptions(
          categories.filter((category) => category.type === "expense"),
          "Uncategorized",
        )}
      />
    </div>
  );
}

const meta = {
  title: "Components/ComboboxField",
  component: CategoryExample,
} satisfies Meta<typeof CategoryExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Searching: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Category" });
    await userEvent.click(trigger);
    const expense = categories.find((category) => category.type === "expense");
    const query = expense?.name.slice(0, 3) ?? "";
    await userEvent.type(await screen.findByRole("combobox", { name: /search/i }), query);
    await userEvent.click(await screen.findByRole("option", { name: expense?.name }));
    await waitFor(() => expect(trigger).toHaveTextContent(expense?.name ?? ""));
  },
};

export const NoMatches: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Category" }));
    await userEvent.type(await screen.findByRole("combobox", { name: /search/i }), "zzzz");
    await expect(await screen.findByText("No matches")).toBeVisible();
  },
};
