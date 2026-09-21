import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getAttachmentsQueryKey } from "@/api/generated";
import { fullAttachments, ids, maximaAttachments, splitAttachments } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { AttachmentCount } from "./attachment-count";
import { TransactionAttachments } from "./transaction-attachments";

function renderWith(transactionId: string, attachments: typeof maximaAttachments) {
  const { client, Wrapper } = createQueryWrapper();
  client.setQueryData(getAttachmentsQueryKey(transactionId), attachments);
  return render(<TransactionAttachments transactionId={transactionId} />, { wrapper: Wrapper });
}

function fileInput() {
  return screen.getByLabelText("Drop files here or choose them");
}

test("lists each file with a download link, who uploaded it and a remove button", async () => {
  renderWith(ids.transactions.split, splitAttachments);

  expect(await screen.findByRole("heading", { name: "Receipts and files" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Download: IMG_4812\.heic$/u })).toHaveAttribute(
    "download",
    "IMG_4812.heic",
  );
  expect(screen.getByText(/Šarūnas Kazlauskas/u)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Remove:/u })).toHaveLength(2);
  expect(screen.queryByRole("img")).toBeNull();
});

test("an image gets a thumbnail served from the download address", async () => {
  renderWith(ids.transactions.maxima, maximaAttachments);

  const image = await screen.findByRole("img", { name: "Preview of maxima-kvitas.jpg" });
  expect(image).toHaveAttribute("src", `/api/attachments/${maximaAttachments[0]?.id}/content`);
});

test("files dropped on the zone are checked before anything is sent", async () => {
  renderWith(ids.transactions.maxima, maximaAttachments);
  await screen.findByText("maxima-kvitas.jpg");
  const notes = new File(["hello"], "notes.txt", { type: "text/plain" });
  const scan = new File(["%PDF-1.7"], "scan.pdf", { type: "application/pdf" });

  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: [notes, scan] } });
  });

  expect(
    screen.getByText("notes.txt is not a JPEG, PNG, WebP, HEIC or PDF file."),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Uploading 1 file…");
});

test("dragging over the zone says the files will be attached", async () => {
  renderWith(ids.transactions.maxima, maximaAttachments);
  await screen.findByText("maxima-kvitas.jpg");

  fireEvent.dragEnter(fileInput());

  expect(screen.getByText("Drop to attach")).toBeInTheDocument();
});

test("a transaction with ten files takes no more", async () => {
  renderWith(ids.transactions.maxima, fullAttachments);

  expect(await screen.findByLabelText("Drop files here or choose them")).toBeDisabled();
});

test("the paperclip names the number of files for screen readers", () => {
  const { Wrapper } = createQueryWrapper();
  const { rerender } = render(<AttachmentCount count={3} />, { wrapper: Wrapper });

  expect(screen.getByText("3 files attached")).toBeInTheDocument();

  rerender(<AttachmentCount count={0} />);
  expect(screen.queryByText(/attached/u)).toBeNull();
});
