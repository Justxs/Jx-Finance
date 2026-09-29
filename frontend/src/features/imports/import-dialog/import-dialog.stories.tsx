import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getImportPreviewMockHandler,
  getInspectCsvMockHandler,
} from "@/api/generated/imports/imports.msw";
import {
  accounts,
  ids,
  mappedCsvPreview,
  missingColumnsProblem,
  revolutInspectionFitting,
} from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { uploadAndPreview } from "@/storybook/import-play";
import { first, openedDialog } from "@/storybook/interactions";
import { ImportDialog } from "./import-dialog";

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
