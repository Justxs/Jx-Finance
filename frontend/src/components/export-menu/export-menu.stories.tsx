import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ExportMenu } from "./export-menu";

const meta = {
  title: "Components/ExportMenu",
  component: ExportMenu,
  args: { csvUrl: "/api/transactions/export", pdfUrl: "/api/transactions/export/pdf" },
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
      "/api/transactions/export",
    );
    await expect(body.getByRole("link", { name: /pdf/i })).toHaveAttribute(
      "href",
      "/api/transactions/export/pdf",
    );
  },
};
