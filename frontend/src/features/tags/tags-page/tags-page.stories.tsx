import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { getDeleteTagMockHandler, getTagsMockHandler } from "@/api/generated/tags/tags.msw";
import { withPageFrame } from "@/storybook/decorators";
import { many, tags } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { TagsPage } from "./tags-page";

const manyTags = many(tags, 30);

const meta = {
  title: "Features/Tags/TagsPage",
  component: TagsPage,
  parameters: { layout: "fullscreen", route: "/tags" },
  decorators: [withPageFrame],
} satisfies Meta<typeof TagsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(tags[0]!.name)).toBeInTheDocument();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LongList: Story = {
  parameters: withHandlers(getTagsMockHandler(manyTags)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add tag|pridėti žymą/i }));
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteTagMockHandler(pending)),
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await expect(
      within(dialog).getByText(/you can undo this straight away|veiksmą galėsite atšaukti/i),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));

    const undo = await screen.findByRole("button", { name: /^(undo|atšaukti)$/i });
    await userEvent.click(undo);

    await expect(await screen.findByText(/brought back|įrašas grąžintas/i)).toBeInTheDocument();
  },
};

export const EditDialogOpen: Story = {
  play: async ({ canvas }) => {
    const editButtons = await canvas.findAllByRole("button", { name: /^(edit|redaguoti)(:|$)/i });
    await userEvent.click(editButtons[0]!);
    await openedDialog();
  },
};
