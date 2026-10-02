import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDismissImportInboxFileMockHandler,
  getImportPreviewMockHandler,
  getInspectCsvMockHandler,
  getListImportInboxMockHandler,
} from "@/api/generated/imports/imports.msw";
import { IMPORT_FILE_INPUT_ID } from "@/features/imports/import-section/import-upload-form";
import {
  accounts,
  camtPreview,
  ids,
  inboxFiles,
  mappedCsvPreview,
  missingColumnsProblem,
  revolutInspectionFitting,
} from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { uploadAndPreview } from "@/storybook/import-play";
import { first, openedDialog } from "@/storybook/interactions";
import { ImportDialog } from "./import-dialog";

const inboxDismissed = fn();

const meta = {
  title: "Features/Imports/ImportDialog",
  component: ImportDialog,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: () => undefined, accounts },
} satisfies Meta<typeof ImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Providers: Story = {};

export const SwedbankUpload: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
    await expect(await screen.findByText(/statement file|išrašo failas/i)).toBeVisible();
  },
};

export const XmlStatementUpload: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /iso 20022/i }));
    await expect(await screen.findByText(/camt\.053/i)).toBeVisible();
  },
};

export const OfxUpload: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /OFX or QFX file/u }));
    await expect(await screen.findByText(/An OFX or QFX statement/u)).toBeVisible();
  },
};

export const Mt940Upload: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /MT940 statement/u }));
    await expect(await screen.findByText(/A SWIFT MT940 statement/u)).toBeVisible();
  },
};

export const PreselectedAccount: Story = {
  args: { initialAccountId: ids.accounts.savings },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
  },
};

export const DiscardEditedReview: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
    await uploadAndPreview(await openedDialog());
    const rows = await screen.findAllByRole("checkbox", { name: /^(select|pasirinkti): /i });
    await userEvent.click(first(rows));
    await userEvent.click(screen.getByRole("button", { name: /all providers|visi teikėjai/i }));
    const confirm = await openedDialog("alertdialog");
    await expect(confirm).toHaveTextContent(/discard this review|atmesti šią peržiūrą/i);
    await userEvent.click(screen.getByRole("button", { name: /^(cancel|atšaukti)$/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(
      screen.getByRole("region", { name: /review rows|eilučių peržiūra/i }),
    ).toBeVisible();
  },
};

export const SavedMappingProvider: Story = {
  play: async () => {
    await expect(await screen.findByRole("button", { name: /^revolut/i })).toHaveTextContent(
      /your csv mapping|jūsų csv susiejimas/i,
    );
    await expect(
      screen.getByRole("button", { name: /other bank \(csv\)|kitas bankas \(csv\)/i }),
    ).toBeVisible();
  },
};

export const MapAnotherBank: Story = {
  play: async () => {
    await userEvent.click(
      await screen.findByRole("button", { name: /other bank \(csv\)|kitas bankas \(csv\)/i }),
    );
    await uploadAndPreview(await openedDialog(), undefined, "genericCsv");
    await expect(
      await screen.findByRole("region", { name: /map the columns|susiekite stulpelius/i }),
    ).toBeVisible();
  },
};

export const UseSavedMappingForFile: Story = {
  parameters: withHandlers(getInspectCsvMockHandler(revolutInspectionFitting)),
  play: async () => {
    await userEvent.click(
      await screen.findByRole("button", { name: /other bank \(csv\)|kitas bankas \(csv\)/i }),
    );
    await uploadAndPreview(await openedDialog(), undefined, "genericCsv");
    await userEvent.click(
      await screen.findByRole("button", { name: /use revolut|naudoti revolut/i }),
    );
    await expect(
      await screen.findByRole("region", { name: /review rows|eilučių peržiūra/i }),
    ).toBeVisible();
  },
};

export const MappedPreviewWithUnreadableRows: Story = {
  parameters: withHandlers(getImportPreviewMockHandler(mappedCsvPreview)),
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /^revolut/i }));
    await uploadAndPreview(await openedDialog(), undefined, "genericCsv");
    await expect(
      await screen.findByText(/2 entries could not be read|nepavyko perskaityti 2/i),
    ).toBeVisible();
    await expect(screen.getByText(/left out by the status filter|būsenos filtro/i)).toBeVisible();
  },
};

export const MappedFileLacksAColumn: Story = {
  parameters: withHandlers(getImportPreviewMockHandler(failWith(missingColumnsProblem))),
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /^revolut/i }));
    await uploadAndPreview(await openedDialog(), undefined, "genericCsv");
    await expect(await screen.findByText(/"Completed Date"/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /update the mapping|atnaujinti susiejimą/i }),
    );
    await expect(
      await screen.findByRole("region", { name: /map the columns|susiekite stulpelius/i }),
    ).toBeVisible();
  },
};

export const EditSavedMapping: Story = {
  play: async () => {
    await userEvent.click(
      await screen.findByRole("button", { name: /^(edit|redaguoti): revolut$/i }),
    );
    await expect(await screen.findByDisplayValue("Revolut")).toBeVisible();
  },
};

export const DeleteSavedMapping: Story = {
  play: async () => {
    await userEvent.click(
      await screen.findByRole("button", { name: /^(delete|ištrinti): revolut$/i }),
    );
    const confirm = await openedDialog("alertdialog");
    await userEvent.click(within(confirm).getByRole("button", { name: /^(delete|ištrinti)$/i }));
    await expect(await screen.findByText(/deleted revolut|ištrinta revolut/i)).toBeVisible();
  },
};

export const ReviewFromTheInbox: Story = {
  parameters: withHandlers(
    getListImportInboxMockHandler(inboxFiles),
    getImportPreviewMockHandler(camtPreview),
    getDismissImportInboxFileMockHandler(({ params }) => {
      inboxDismissed(params.id);
    }),
  ),
  play: async () => {
    const waiting = first(inboxFiles);
    const inbox = within(await screen.findByRole("region", { name: "Waiting in the inbox" }));
    await userEvent.click(first(inbox.getAllByRole("button", { name: "Review" })));

    const dialog = within(await openedDialog());
    await expect(
      await dialog.findByRole("region", { name: /review rows|eilučių peržiūra/i }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Import from Bank statement XML (ISO 20022)" }),
    ).toBeVisible();
    await expect(document.getElementById(IMPORT_FILE_INPUT_ID)).toHaveTextContent(waiting.fileName);
    await expect(dialog.getByRole("combobox", { name: "Account" })).toHaveTextContent(
      "Swedbank einamoji",
    );
    await expect(inboxDismissed).not.toHaveBeenCalled();

    await userEvent.click(await dialog.findByRole("button", { name: /^Import \d+ rows?$/u }));
    await waitFor(() => expect(inboxDismissed).toHaveBeenCalledWith(waiting.id));
  },
};

export const InboxPreviewFails: Story = {
  parameters: withHandlers(
    getListImportInboxMockHandler(inboxFiles),
    getImportPreviewMockHandler(failWith(missingColumnsProblem)),
  ),
  play: async () => {
    const waiting = inboxFiles[1]!;
    const inbox = within(await screen.findByRole("region", { name: "Waiting in the inbox" }));
    await userEvent.click(inbox.getAllByRole("button", { name: "Review" })[1]!);

    await expect(await screen.findByText(/The file has no column named/u)).toBeVisible();
    await expect(
      within(screen.getByRole("region", { name: "Waiting in the inbox" })).getByText(
        waiting.fileName,
      ),
    ).toBeVisible();
    await expect(screen.getByRole("button", { name: /^Swedbank/u })).toBeVisible();
  },
};
