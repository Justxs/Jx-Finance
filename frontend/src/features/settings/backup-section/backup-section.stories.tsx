import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getBackupsMockHandler,
  getRestoreBackupMockHandler,
  getUploadBackupMockHandler,
} from "@/api/generated/backups/backups.msw";
import {
  backupInvalidFileProblem,
  backupRestorePassword,
  backupSchemaProblem,
  backupTooLargeProblem,
  databaseBusyProblem,
  lockedOutProblem,
} from "@/storybook/fixtures";
import {
  errorHandlers,
  failWith,
  failWithStatus,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { BackupSection } from "./backup-section";

const meta = {
  title: "Features/Settings/BackupSection",
  component: BackupSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof BackupSection>;

export default meta;
type Story = StoryObj<typeof meta>;

async function confirmRestoreOfNewest(
  canvasElement: HTMLElement,
  password = backupRestorePassword,
) {
  const canvas = within(canvasElement);
  const [restore] = await canvas.findAllByRole("button", { name: /^Restore:/u });
  await userEvent.click(restore as HTMLElement);

  const dialog = within(await screen.findByRole("alertdialog"));
  const confirm = dialog.getByRole("button", { name: "Replace all data" });
  await expect(confirm).toBeDisabled();
  const word = dialog.getByLabelText("Type RESTORE to confirm");
  fireEvent.change(word, { target: { value: "restore" } });
  fireEvent.change(dialog.getByLabelText("Current password"), { target: { value: password } });
  await expect(confirm).toBeDisabled();
  fireEvent.change(dialog.getByLabelText("Current password"), { target: { value: "" } });
  fireEvent.change(word, { target: { value: "RESTORE" } });
  await expect(confirm).toBeDisabled();
  fireEvent.change(dialog.getByLabelText("Current password"), { target: { value: password } });
  await waitFor(() => expect(confirm).toBeEnabled());
  await userEvent.click(confirm);
  return dialog;
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Before the Swedbank import")).toBeVisible();
    await expect(canvas.getByText("403 KB")).toBeVisible();
    await expect(canvas.getByText("5.6 MB")).toBeVisible();
    const restoreButtons = canvas.getAllByRole("button", { name: /^Restore:/u });
    await expect(restoreButtons[2]).toBeDisabled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Empty: Story = {
  parameters: { msw: { handlers: [getBackupsMockHandler([]), ...handlers] } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("No backup has been taken yet."),
    ).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadFailed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const BackUpNow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Note"), "Before upgrade");
    await userEvent.click(canvas.getByRole("button", { name: "Back up now" }));
    await expect(await screen.findByText("Backup taken.")).toBeInTheDocument();
  },
};

export const EditNote: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [edit] = await canvas.findAllByRole("button", { name: /^Edit note:/u });
    await userEvent.click(edit as HTMLElement);
    const dialog = within(await screen.findByRole("dialog"));
    await expect(dialog.getByLabelText("Note")).toHaveValue("Before the Swedbank import");
  },
};

export const DeleteAsksFirst: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [remove] = await canvas.findAllByRole("button", { name: /^Delete backup:/u });
    await userEvent.click(remove as HTMLElement);
    await openedDialog("alertdialog");
  },
};

export const RestorePending: Story = {
  parameters: {
    msw: { handlers: [getRestoreBackupMockHandler(pending), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement);
    await waitFor(() => expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled());
    await expect(dialog.getByRole("button", { name: /Replace all data/u })).toBeDisabled();
  },
};

export const OtherVersionRejected: Story = {
  parameters: {
    msw: {
      handlers: [getRestoreBackupMockHandler(failWith(backupSchemaProblem, 400)), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement);
    await expect(await dialog.findByText(/another version of the application/u)).toBeVisible();
  },
};

export const NoFileChosen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Upload" }));
    await expect(canvas.getByText("Choose a backup file first.")).toBeVisible();
  },
};

export const UploadRejected: Story = {
  parameters: {
    msw: {
      handlers: [getUploadBackupMockHandler(failWith(backupInvalidFileProblem, 400)), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const file = new File(["not a backup"], "notes.json", { type: "application/json" });
    await userEvent.upload(canvas.getByLabelText("Backup file"), file);
    await userEvent.click(canvas.getByRole("button", { name: "Upload" }));
    await expect(await canvas.findByText(/not a usable backup/u)).toBeVisible();
  },
};

export const RestoreWrongPassword: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement, "not-my-password");

    await expect(await dialog.findByText("The current password is wrong.")).toBeVisible();
    await expect(dialog.getByLabelText("Current password")).toHaveValue("");
    await expect(dialog.getByRole("button", { name: "Replace all data" })).toBeDisabled();
  },
};

export const RestoreLockedOut: Story = {
  parameters: {
    msw: { handlers: [getRestoreBackupMockHandler(failWith(lockedOutProblem, 429)), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement);

    await expect(await dialog.findByText(/Wait 15 minutes and try again/u)).toBeVisible();
  },
};

export const RestoreThrottledWithoutBody: Story = {
  parameters: {
    msw: { handlers: [getRestoreBackupMockHandler(failWithStatus(429)), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement);

    await expect(
      await dialog.findByText("Too many attempts. Wait a moment and try again."),
    ).toBeVisible();
  },
};

export const RestoreWhileDatabaseBusy: Story = {
  parameters: {
    msw: {
      handlers: [getRestoreBackupMockHandler(failWith(databaseBusyProblem, 409)), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = await confirmRestoreOfNewest(canvasElement);

    await expect(await dialog.findByText(/Nothing was changed; try again/u)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Replace all data" })).toBeEnabled();
  },
};

export const UploadTooLarge: Story = {
  parameters: {
    msw: {
      handlers: [getUploadBackupMockHandler(failWith(backupTooLargeProblem, 400)), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const file = new File(["{}"], "huge.json.gz", { type: "application/gzip" });
    await userEvent.upload(canvas.getByLabelText("Backup file"), file);
    await userEvent.click(canvas.getByRole("button", { name: "Upload" }));
    await expect(
      await canvas.findByText(/more data than this installation accepts/u),
    ).toBeVisible();
  },
};
