import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
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
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(await screen.findByRole("link", { name: /csv/i })).toHaveAttribute(
      "href",
      TRANSACTIONS_EXPORT_CSV_PATH,
    );
    await expect(screen.getByRole("button", { name: /pdf/i })).toBeEnabled();
  },
};

export const PdfTooManyRows: Story = {
  parameters: withHandlers(
    onRouteOf(getExportTransactionsPdfMockHandler(new ArrayBuffer(0)), () =>
      problem(exportTooManyRowsProblem),
    ),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button"));
    await userEvent.click(await screen.findByRole("button", { name: /pdf/i }));

    await expect(await screen.findByText(/Too many transactions for a PDF/u)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("link", { name: /csv/i })).toBeNull());
  },
};
