import type { Meta, StoryObj } from "@storybook/react-vite";
import { getImportInboxStatusMockHandler } from "@/api/generated/imports/imports.msw";
import { importInboxOff, importInboxQuiet } from "@/storybook/fixtures";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { ImportInboxSection } from "./import-inbox-section";

const meta = {
  title: "Features/Settings/ImportInboxSection",
  component: ImportInboxSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof ImportInboxSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Failures: Story = {};

export const NoFailures: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(importInboxQuiet)),
};

export const Off: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(importInboxOff)),
};

export const Loading: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(failWithStatus(500))),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
