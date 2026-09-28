import type { Meta, StoryObj } from "@storybook/react-vite";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { memberUser } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { SettingsLayout } from "./settings-nav";

const meta = {
  title: "Features/Settings/SettingsLayout",
  component: SettingsLayout,
  parameters: { layout: "padded", route: "/settings" },
  args: {
    current: "general",
    children: <p className="text-sm text-muted-foreground">Section content.</p>,
  },
} satisfies Meta<typeof SettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Administrator: Story = {};

export const PersonalSectionActive: Story = {
  args: { current: "notifications" },
  parameters: { route: "/profile" },
};

export const Member: Story = {
  args: { current: "account" },
  parameters: { route: "/profile", ...withHandlers(getMeMockHandler(memberUser)) },
};
