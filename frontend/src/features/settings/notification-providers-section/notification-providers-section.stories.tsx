import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { NotificationProvidersSection } from "./notification-providers-section";

const meta = {
  title: "Features/Settings/NotificationProvidersSection",
  component: NotificationProvidersSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof NotificationProvidersSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Email: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("tab", { name: "Email" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(await canvas.findByLabelText("Server")).toHaveValue("smtp.example.lt");
  },
};

export const Discord: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Discord" }));
    await expect(
      await canvas.findByRole("checkbox", { name: "Send notifications to Discord" }),
    ).toBeChecked();
    await expect(canvas.queryByLabelText("Server")).toBeNull();
  },
};
