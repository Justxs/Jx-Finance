import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileNav, profileSections } from "./profile-nav";

const meta = {
  title: "Features/Profile/ProfileNav",
  component: ProfileNav,
  parameters: { route: "/profile" },
  decorators: [
    (Story) => (
      <div className="w-[min(16rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: { current: "account", sections: profileSections },
} satisfies Meta<typeof ProfileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecurityActive: Story = { args: { current: "security" } };

export const WithoutImport: Story = {
  args: { sections: profileSections.filter((section) => section !== "import") },
};
