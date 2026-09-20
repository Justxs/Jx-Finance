import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { SettingsNav, settingsSections } from "./settings-nav";

const meta = {
  title: "Features/Settings/SettingsNav",
  component: SettingsNav,
  parameters: { route: "/settings" },
  decorators: [withWidth("w-[min(16rem,90vw)]")],
  args: { current: "general", sections: settingsSections },
} satisfies Meta<typeof SettingsNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BackupsActive: Story = { args: { current: "backups" } };

export const WithoutImport: Story = {
  args: { sections: settingsSections.filter((section) => section !== "import") },
};
