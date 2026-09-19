import type { Meta, StoryObj } from "@storybook/react-vite";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { ImportDataSection } from "./import-data-section";

const meta = {
  title: "Features/Imports/ImportDataSection",
  component: ImportDataSection,
  decorators: [
    (Story) => (
      <div className="w-[min(40rem,90vw)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImportDataSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoAccounts: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
