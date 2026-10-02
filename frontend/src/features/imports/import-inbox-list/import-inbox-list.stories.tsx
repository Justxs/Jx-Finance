import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDismissImportInboxFileMockHandler,
  getImportPreviewMockHandler,
} from "@/api/generated/imports/imports.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, importPreview, inboxFiles } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { ImportInboxList } from "./import-inbox-list";

const swedbankFile = first(inboxFiles);
const previewed = fn();
const dismissed = fn();

const meta = {
  title: "Features/Imports/ImportInboxList",
  component: ImportInboxList,
  decorators: [withWidth("panel")],
  args: { items: inboxFiles, accounts, onReview: fn() },
} satisfies Meta<typeof ImportInboxList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole("region", { name: "Waiting in the inbox" }));
    await expect(list.getByText("swedbank-2026-09.xml")).toBeVisible();
    await expect(list.getByText(/^Swedbank einamoji · arrived /u)).toBeVisible();
    await expect(list.getByText(/^Taupomoji sąskaita · arrived /u)).toBeVisible();
    await expect(list.getAllByRole("button", { name: "Review" })).toHaveLength(2);
  },
};

export const Reviewing: Story = {
  parameters: withHandlers(
    getImportPreviewMockHandler(async ({ request }) => {
      const form = await request.formData();
      previewed({
        accountId: form.get("accountId"),
        format: form.get("format"),
        mappingId: form.get("mappingId"),
      });
      return importPreview;
    }),
  ),
  play: async ({ canvas, args }) => {
    await userEvent.click(first(await canvas.findAllByRole("button", { name: "Review" })));
    await waitFor(() => expect(args.onReview).toHaveBeenCalled());
    await expect(previewed).toHaveBeenCalledWith({
      accountId: swedbankFile.accountId,
      format: swedbankFile.format,
      mappingId: null,
    });
    const [review] = args.onReview.mock.lastCall ?? [];
    await expect(review).toEqual(
      expect.objectContaining({ item: swedbankFile, preview: importPreview }),
    );
    await expect(review?.file.name).toBe(swedbankFile.fileName);
  },
};

export const Dismissing: Story = {
  parameters: withHandlers(
    getDismissImportInboxFileMockHandler(({ params }) => {
      dismissed(params.id);
    }),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: `Dismiss: ${swedbankFile.fileName}` }),
    );
    const dialog = within(await openedDialog("alertdialog"));
    await expect(dialog.getByText("Dismiss this statement?")).toBeVisible();
    await expect(dialog.getByText(swedbankFile.fileName)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(dismissed).not.toHaveBeenCalled();

    await userEvent.click(
      canvas.getByRole("button", { name: `Dismiss: ${swedbankFile.fileName}` }),
    );
    await userEvent.click(
      within(await openedDialog("alertdialog")).getByRole("button", { name: "Dismiss" }),
    );
    await waitFor(() => expect(dismissed).toHaveBeenCalledWith(swedbankFile.id));
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("region", { name: "Waiting in the inbox" })).toBeNull();
  },
};

export const Phone: Story = {
  decorators: [withWidth("w-[343px]")],
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
