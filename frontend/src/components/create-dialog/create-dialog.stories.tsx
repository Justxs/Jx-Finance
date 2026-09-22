import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button/button";
import { openedDialog } from "@/storybook/interactions";
import { CreateDialog } from "./create-dialog";

const meta = {
  title: "Components/CreateDialog",
  component: CreateDialog,
  args: {
    label: "Add tag",
    title: "New tag",
    children: (close) => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">The form goes here.</p>
        <Button onClick={close}>Done</Button>
      </div>
    ),
  },
} satisfies Meta<typeof CreateDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Opened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add tag" }));
    await openedDialog();
  },
};

export const ClosesFromContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Add tag" }));
    await userEvent.click(await page.findByRole("button", { name: "Done" }));
    await expect(page.queryByRole("dialog")).toBeNull();
  },
};
