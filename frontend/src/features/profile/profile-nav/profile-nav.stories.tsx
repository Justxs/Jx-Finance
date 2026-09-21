import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { ProfileNav, profileSections } from "./profile-nav";

const meta = {
  title: "Features/Profile/ProfileNav",
  component: ProfileNav,
  parameters: { route: "/profile" },
  decorators: [withWidth("w-[min(16rem,90vw)]")],
  args: { current: "account", sections: profileSections },
} satisfies Meta<typeof ProfileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecurityActive: Story = { args: { current: "security" } };

export const SessionsActive: Story = { args: { current: "sessions" } };

export const WithoutImport: Story = {
  args: { sections: profileSections.filter((section) => section !== "import") },
};
