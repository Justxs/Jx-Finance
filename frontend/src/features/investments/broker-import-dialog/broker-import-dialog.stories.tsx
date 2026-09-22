import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  getBrokerConnectionsMockHandler,
  getImportBrokerReportMockHandler,
  getSyncBrokerConnectionMockHandler,
} from "@/api/generated/investments/investments.msw";
import {
  accounts,
  brokerAccount,
  databaseBusyProblem,
  brokerImportNothingNew,
  brokerImportWithWarnings,
  brokerSyncProblem,
  failedBrokerConnection,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { BrokerImportDialog } from "./broker-import-dialog";
import { BROKER_UPLOAD_FILE_INPUT_ID } from "./upload-panel";

const sampleReport =
  '<FlexQueryResponse queryName="Jx Finance" type="AF"><FlexStatements count="1" /></FlexQueryResponse>';

const meta = {
  title: "Features/Investments/BrokerImportDialog",
  component: BrokerImportDialog,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: fn(), accounts, accountId: brokerAccount.id },
} satisfies Meta<typeof BrokerImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function uploadReport() {
  const body = within(document.body);
  const submit = await body.findByRole("button", { name: "Import" });
  const fileInput = document.querySelector<HTMLInputElement>(`#${BROKER_UPLOAD_FILE_INPUT_ID}`);
  if (!fileInput) {
    throw new Error("The report file input is missing.");
  }
  const file = new File([sampleReport], "flex-2026-09.xml", { type: "text/xml" });
  await userEvent.upload(fileInput, file);
  await userEvent.click(submit);
}

export const Upload: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const UploadResult: Story = {
  play: async () => {
    await uploadReport();
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(await dialog.findByText("Import finished.")).toBeInTheDocument();
    const result = within(dialog.getByRole("status"));
    await expect(result.getByText("14 trades imported.")).toBeInTheDocument();
    await expect(result.getByText("1 new security added.")).toBeInTheDocument();
    await expect(
      result.getByText("21 entries were already imported and left alone."),
    ).toBeInTheDocument();
    await expect(result.getByText("1 row skipped.")).toBeInTheDocument();
  },
};

export const UploadResultWithWarnings: Story = {
  parameters: withHandlers(getImportBrokerReportMockHandler(brokerImportWithWarnings)),
  play: async () => {
    await uploadReport();
    const dialog = within(await within(document.body).findByRole("dialog"));
    const result = within(await dialog.findByRole("status"));
    await expect(await result.findByText("2 stock splits booked.")).toBeVisible();
    await expect(result.getByText("Check your holdings")).toBeVisible();
    await expect(result.getByText("Merger or takeover: 1")).toBeVisible();
    await expect(result.getByRole("rowheader", { name: "NVDA" })).toBeVisible();
  },
};

export const UploadWhileDatabaseBusy: Story = {
  parameters: withHandlers(getImportBrokerReportMockHandler(failWith(databaseBusyProblem, 409))),
  play: async () => {
    await uploadReport();
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(
      await dialog.findByText(/The database was busy with other work\. Nothing was changed/u),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Import" })).toBeEnabled();
  },
};

export const SyncWhileDatabaseBusy: Story = {
  args: { initialTab: "sync" },
  parameters: withHandlers(getSyncBrokerConnectionMockHandler(failWith(databaseBusyProblem, 409))),
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(await dialog.findByRole("button", { name: "Sync now" }));
    await expect(
      await dialog.findByText(/The database was busy with other work\. Nothing was changed/u),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sync now" })).toBeEnabled();
  },
};

export const UploadNothingNew: Story = {
  parameters: withHandlers(getImportBrokerReportMockHandler(brokerImportNothingNew)),
  play: async () => {
    await uploadReport();
    await expect(
      await within(document.body).findByText("Nothing new to import."),
    ).toBeInTheDocument();
  },
};

export const UploadWithoutFile: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Import" }));
    await expect(await body.findByText("Choose an XML file first.")).toBeInTheDocument();
  },
};

export const ConnectionExisting: Story = {
  args: { initialTab: "sync" },
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByLabelText("Query ID")).toHaveValue("1284467");
    await expect(body.getByLabelText("Flex token")).toHaveValue("");
    await expect(body.getByRole("button", { name: "Sync now" })).toBeEnabled();
  },
};

export const ConnectionSavedClearsToken: Story = {
  args: { initialTab: "sync" },
  play: async () => {
    const body = within(document.body);
    const token = await body.findByLabelText("Flex token");
    await userEvent.type(token, "482913007755");
    await expect(token).toHaveValue("482913007755");
    await userEvent.click(body.getByRole("button", { name: "Save" }));
    await expect(await body.findByText("Connection saved.")).toBeInTheDocument();
    await waitFor(() => expect(body.getByLabelText("Flex token")).toHaveValue(""));
  },
};

export const UploadPending: Story = {
  parameters: withHandlers(getImportBrokerReportMockHandler(pending)),
  play: async () => {
    await uploadReport();
    const body = within(document.body);
    await expect(await body.findByText(/Importing the report/)).toBeInTheDocument();
    await expect(body.getByRole("tab", { name: "Automatic sync" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(body.getByRole("tab", { name: "Upload report" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

export const ConnectionNew: Story = {
  args: { initialTab: "sync" },
  parameters: withHandlers(getBrokerConnectionsMockHandler([])),
};

export const ConnectionError: Story = {
  args: { initialTab: "sync" },
  parameters: withHandlers(
    getBrokerConnectionsMockHandler([failedBrokerConnection]),
    getSyncBrokerConnectionMockHandler(failWith(brokerSyncProblem, 400)),
  ),
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByText("Last sync failed")).toBeInTheDocument();
    await expect(body.getAllByText(/token has expired/)).toHaveLength(1);

    await userEvent.click(await body.findByRole("button", { name: "Sync now" }));
    await waitFor(() => expect(body.getAllByText(/token has expired/).length).toBeGreaterThan(1));
    await expect(body.getByRole("button", { name: "Sync now" })).toBeEnabled();
  },
};

export const SyncPending: Story = {
  args: { initialTab: "sync" },
  parameters: withHandlers(getSyncBrokerConnectionMockHandler(pending)),
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Sync now" }));
    await expect(await body.findByText(/can take up to a minute/)).toBeInTheDocument();
  },
};

export const SyncResult: Story = {
  args: { initialTab: "sync" },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Sync now" }));
    await expect(await body.findByText("Import finished.")).toBeInTheDocument();
  },
};

export const HelpOpen: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByText("How to create the Flex Query"));
    await expect(await body.findByText(/Activity Flex Query\./)).toBeVisible();
  },
};
