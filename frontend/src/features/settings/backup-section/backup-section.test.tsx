import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getUploadBackupMockHandler } from "@/api/generated/backups/backups.msw";
import { backupInvalidFileProblem, backupRestorePassword, backups } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { chooseMenuItem, first, openedDialog } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { BackupSection } from "./backup-section";

const api = mockApi();
const newest = first(backups);

async function actionOnNewest(item: string) {
  await chooseMenuItem(first(await screen.findAllByRole("button", { name: /^Actions:/u })), item);
}

async function openRestore() {
  await actionOnNewest("Restore");
  return within(await openedDialog("alertdialog"));
}

function fillRestore(dialog: ReturnType<typeof within>, word: string, password: string) {
  fireEvent.change(dialog.getByLabelText("Type RESTORE to confirm"), { target: { value: word } });
  fireEvent.change(dialog.getByLabelText("Current password"), { target: { value: password } });
}

test("backing up now sends the trimmed note, confirms it and empties the field", async () => {
  renderInApp(<BackupSection />);

  const note = await screen.findByRole("textbox", { name: "Note" });
  fireEvent.change(note, { target: { value: "  Before upgrade " } });
  fireEvent.click(screen.getByRole("button", { name: "Back up now" }));

  expect(await screen.findByText("Backup taken.")).toBeInTheDocument();
  expect(await api.lastBody("POST", "/api/backups")).toEqual({ note: "Before upgrade" });
  await waitFor(() => expect(note).toHaveValue(""));
});

test("editing a note saves it under the backup's id and closes the dialog", async () => {
  renderInApp(<BackupSection />);

  await actionOnNewest("Edit note");
  const dialog = within(await openedDialog());
  expect(dialog.getByLabelText("Note")).toHaveValue(newest.note);
  fireEvent.change(dialog.getByLabelText("Note"), { target: { value: "After the import" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Note saved.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("PUT", `/api/backups/${newest.id}`)).toEqual({
    note: "After the import",
  });
});

test("cancelling a delete keeps the backup and sends nothing", async () => {
  renderInApp(<BackupSection />);

  await actionOnNewest("Delete");
  const dialog = within(await openedDialog("alertdialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("DELETE", `/api/backups/${newest.id}`)).toHaveLength(0);
});

test("confirming a delete removes the backup and says so", async () => {
  renderInApp(<BackupSection />);

  await actionOnNewest("Delete");
  const dialog = within(await openedDialog("alertdialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("Backup deleted.")).toBeInTheDocument();
  expect(api.sent("DELETE", `/api/backups/${newest.id}`)).toHaveLength(1);
});

test("a backup from another version cannot be restored", async () => {
  renderInApp(<BackupSection />);

  const menus = await screen.findAllByRole("button", { name: /^Actions:/u });
  await userEvent.click(menus[2] ?? first(menus));

  expect(await screen.findByRole("menuitem", { name: "Restore" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("restoring waits for the confirm word and a password before it can be pressed", async () => {
  renderInApp(<BackupSection />);

  const dialog = await openRestore();
  const confirm = dialog.getByRole("button", { name: "Replace all data" });
  expect(confirm).toBeDisabled();

  fillRestore(dialog, "restore", backupRestorePassword);
  expect(confirm).toBeDisabled();
  fillRestore(dialog, "RESTORE", "");
  expect(confirm).toBeDisabled();
  fillRestore(dialog, "RESTORE", backupRestorePassword);

  await waitFor(() => expect(confirm).toBeEnabled());
  expect(api.sent("POST", `/api/backups/${newest.id}/restore`)).toHaveLength(0);
});

test("a confirmed restore sends the password, ends the session and goes to sign in", async () => {
  const { router } = renderInApp(<BackupSection />);

  const dialog = await openRestore();
  fillRestore(dialog, "RESTORE", backupRestorePassword);
  fireEvent.click(dialog.getByRole("button", { name: "Replace all data" }));

  expect(
    await screen.findByText(/^Backup from .* restored\. Sign in again\.$/u),
  ).toBeInTheDocument();
  expect(await api.lastBody("POST", `/api/backups/${newest.id}/restore`)).toEqual({
    password: backupRestorePassword,
  });
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
});

test("a wrong password keeps the dialog open, clears the password and disables the button", async () => {
  renderInApp(<BackupSection />);

  const dialog = await openRestore();
  fillRestore(dialog, "RESTORE", "not-my-password");
  fireEvent.click(dialog.getByRole("button", { name: "Replace all data" }));

  expect(await dialog.findByText("The current password is wrong.")).toBeInTheDocument();
  expect(dialog.getByLabelText("Current password")).toHaveValue("");
  expect(dialog.getByRole("button", { name: "Replace all data" })).toBeDisabled();
});

test("cancelling a restore closes the dialog without sending", async () => {
  renderInApp(<BackupSection />);

  const dialog = await openRestore();
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("POST", `/api/backups/${newest.id}/restore`)).toHaveLength(0);
});

test("uploading without a file asks for one and sends nothing", async () => {
  renderInApp(<BackupSection />);

  fireEvent.click(await screen.findByRole("button", { name: "Upload" }));

  expect(await screen.findByText("Choose a backup file first.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/backups/upload")).toHaveLength(0);
});

test("an uploaded file is added to the list", async () => {
  renderInApp(<BackupSection />);

  const file = new File(["{}"], "backup.json.gz", { type: "application/gzip" });
  await userEvent.upload(await screen.findByLabelText("Backup file"), file);
  fireEvent.click(screen.getByRole("button", { name: "Upload" }));

  expect(await screen.findByText("Backup added to the list.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/backups/upload")).toHaveLength(1);
});

test("a file that is not a backup is refused with the server's reason", async () => {
  api.use(getUploadBackupMockHandler(failWith(backupInvalidFileProblem)));
  renderInApp(<BackupSection />);

  const file = new File(["not a backup"], "notes.json", { type: "application/json" });
  await userEvent.upload(await screen.findByLabelText("Backup file"), file);
  fireEvent.click(screen.getByRole("button", { name: "Upload" }));

  expect(await screen.findByText(/not a usable backup/u)).toBeInTheDocument();
});
