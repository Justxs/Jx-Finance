import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getAttachmentsMockHandler,
  getDeleteAttachmentMockHandler,
  getUploadAttachmentMockHandler,
} from "@/api/generated/attachments/attachments.msw";
import type { AttachmentResponse } from "@/api/generated/model";
import {
  attachmentContentMismatchProblem,
  fullAttachments,
  ids,
  maximaAttachments,
} from "@/storybook/fixtures";
import {
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { readUpload, uploadedAttachment } from "@/storybook/handlers/attachments";
import { openedDialog } from "@/storybook/interactions";
import { MAX_ATTACHMENT_BYTES } from "./attachment-files";
import { TransactionAttachments } from "./transaction-attachments";

const meta = {
  title: "Features/Transactions/TransactionAttachments",
  component: TransactionAttachments,
  args: { transactionId: ids.transactions.maxima },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TransactionAttachments>;

export default meta;
type Story = StoryObj<typeof meta>;

function statefulHandlers(initial: AttachmentResponse[]) {
  let live = initial;
  return [
    getAttachmentsMockHandler(() => live),
    getUploadAttachmentMockHandler(async ({ params, request }) => {
      const file = await readUpload(request);
      const created = uploadedAttachment(
        String(params.transactionId),
        file ?? new File([], "receipt.pdf", { type: "application/pdf" }),
      );
      live = [...live, created];
      return created;
    }),
    getDeleteAttachmentMockHandler(({ params }) => {
      live = live.filter((attachment) => attachment.id !== params.id);
    }),
    ...handlers,
  ];
}

function pdf(name: string) {
  return new File(["%PDF-1.7\n%%EOF"], name, { type: "application/pdf" });
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("maxima-kvitas.jpg")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Preview of maxima-kvitas.jpg" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Download: maxima-kvitas.jpg" })).toHaveAttribute(
      "href",
      `/api/attachments/${maximaAttachments[0]?.id}/content`,
    );
    await expect(canvas.getByRole("button", { name: "Remove: maxima-kvitas.jpg" })).toBeEnabled();
    await expect(canvas.getByLabelText("Drop files here or choose them")).toBeEnabled();
  },
};

export const DocumentsAndPhotos: Story = {
  args: { transactionId: ids.transactions.split },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("IMG_4812.heic")).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(canvas.getByText(/Šarūnas Kazlauskas/u)).toBeVisible();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Čekiai ir failai")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Pašalinti: maxima-kvitas.jpg" }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: { transactionId: ids.transactions.salary },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No files attached yet.")).toBeVisible();
  },
};

export const Full: Story = {
  parameters: withHandlers(getAttachmentsMockHandler(fullAttachments)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("kvitas-10.png")).toBeVisible();
    await expect(canvas.getByLabelText("Drop files here or choose them")).toBeDisabled();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = {
  parameters: { msw: { handlers: errorHandlers } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("The files of this transaction could not be loaded."),
    ).toBeVisible();
  },
};

export const UploadThenRemoveWithUndo: Story = {
  parameters: { msw: { handlers: statefulHandlers(maximaAttachments) } },
  play: async ({ canvas }) => {
    await canvas.findByText("maxima-kvitas.jpg");

    await userEvent.upload(canvas.getByLabelText("Drop files here or choose them"), [
      pdf("saskaita.pdf"),
      pdf("garantija.pdf"),
    ]);

    await expect(await canvas.findByText("garantija.pdf")).toBeVisible();
    await expect(canvas.getByText("saskaita.pdf")).toBeVisible();
    await expect(await screen.findByText("2 files attached")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Remove: saskaita.pdf" }));

    const dialog = within(await openedDialog("alertdialog"));
    await expect(dialog.getByText("saskaita.pdf")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Remove" }));

    await expect(await screen.findByText("Deleted saskaita.pdf")).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByText("saskaita.pdf")).toBeNull());
  },
};

export const UploadInProgress: Story = {
  parameters: withHandlers(getUploadAttachmentMockHandler(pending)),
  play: async ({ canvas }) => {
    await canvas.findByText("maxima-kvitas.jpg");

    await userEvent.upload(canvas.getByLabelText("Drop files here or choose them"), [
      pdf("lėtas.pdf"),
    ]);

    await expect(await canvas.findByRole("status")).toHaveTextContent("Uploading 1 file…");
    await expect(canvas.getByLabelText("Drop files here or choose them")).toBeDisabled();
  },
};

export const RefusedFiles: Story = {
  parameters: withHandlers(
    getUploadAttachmentMockHandler(failWith(attachmentContentMismatchProblem)),
  ),
  play: async ({ canvas }) => {
    await canvas.findByText("maxima-kvitas.jpg");
    const huge = new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], "panorama.png", {
      type: "image/png",
    });

    await userEvent.upload(canvas.getByLabelText("Drop files here or choose them"), [
      huge,
      pdf("netikras.pdf"),
    ]);

    await expect(await canvas.findByText("panorama.png is larger than 10 MB.")).toBeVisible();
    await expect(
      await canvas.findByText(
        "The file's content does not match its type. Save it again from the program that made it and retry.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByText("netikras.pdf")).toBeNull();
  },
};
