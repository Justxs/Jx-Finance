import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getExportTransactionsPdfMockHandler } from "@/api/generated/transactions/transactions.msw";
import { TRANSACTIONS_EXPORT_CSV_PATH, TRANSACTIONS_EXPORT_PDF_PATH } from "@/lib/export-url";
import { exportTooManyRowsProblem } from "@/storybook/fixtures";
import { onRouteOf, problem, withHandlers } from "@/storybook/handlers";
import { ExportMenu } from "./export-menu";

const meta = {
  title: "Components/ExportMenu",
  component: ExportMenu,
  args: { csvUrl: TRANSACTIONS_EXPORT_CSV_PATH, pdfUrl: TRANSACTIONS_EXPORT_PDF_PATH },
} satisfies Meta<typeof ExportMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole("link", { name: /csv/i })).toHaveAttribute(
      "href",
      TRANSACTIONS_EXPORT_CSV_PATH,
    );
    await expect(body.getByRole("button", { name: /pdf/i })).toBeEnabled();
  },
};

export const PdfTooManyRows: Story = {
  parameters: withHandlers(
    onRouteOf(getExportTransactionsPdfMockHandler(new ArrayBuffer(0)), () =>
      problem(exportTooManyRowsProblem, 400),
    ),
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("button", { name: /pdf/i }));

    await expect(await body.findByText(/Too many transactions for a PDF/u)).toBeInTheDocument();
    await waitFor(() => expect(body.queryByRole("link", { name: /csv/i })).toBeNull());
  },
};
