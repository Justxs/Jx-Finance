import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { accounts, inboxFiles } from "@/storybook/fixtures";
import { ImportInboxList } from "./import-inbox-list";

const meta = {
  title: "Features/Imports/ImportInboxList",
  component: ImportInboxList,
  decorators: [withWidth("panel")],
  args: { items: inboxFiles, accounts, onReview: () => undefined },
} satisfies Meta<typeof ImportInboxList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const Phone: Story = {
  decorators: [withWidth("w-[343px]")],
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
