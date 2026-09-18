import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageHeader } from "./page-header";
import { Button } from "./ui/button";

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  args: { title: "Transactions" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    children: (
      <>
        <Button variant="outline">Export CSV</Button>
        <Button>Add transaction</Button>
      </>
    ),
  },
};

export const LongTitleManyActions: Story = {
  args: {
    title: "Recurring bills and subscriptions for the Kazlauskai family household in Vilnius",
    children: (
      <>
        <Button variant="outline">Import</Button>
        <Button variant="outline">Export CSV</Button>
        <Button variant="outline">Export PDF</Button>
        <Button>Add recurring bill</Button>
      </>
    ),
  },
};

export const NarrowContainer: Story = {
  args: WithActions.args,
  decorators: [
    (Story) => (
      <div className="w-64 border border-dashed p-2">
        <Story />
      </div>
    ),
  ],
};
