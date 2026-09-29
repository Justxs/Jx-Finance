import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { ExportDataPanel } from "./export-data-panel";

const meta = {
  title: "Features/Profile/ExportDataPanel",
  component: ExportDataPanel,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof ExportDataPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Download my data" })).toHaveAttribute(
      "href",
      "/api/users/me/export",
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Include attached files" }),
    ).not.toBeChecked();
  },
};

export const WithAttachments: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Include attached files" }));

    await expect(canvas.getByRole("link", { name: "Download my data" })).toHaveAttribute(
      "href",
      "/api/users/me/export?attachments=true",
    );
  },
};
