import type { Meta, StoryObj } from "@storybook/react-vite";
import { Palette, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { withWidth } from "@/storybook/decorators";
import { SectionNav, type SectionNavGroup } from "./section-nav";

const groups: SectionNavGroup[] = [
  {
    labelKey: "settingsHub.personal",
    items: [
      {
        id: "account",
        labelKey: "profile.detailsTitle",
        icon: UserRound,
        link: { to: "/profile", search: { section: "account" } },
      },
      {
        id: "security",
        labelKey: "profile.twoFactorTitle",
        icon: ShieldCheck,
        link: { to: "/profile", search: { section: "security" } },
      },
      {
        id: "appearance",
        labelKey: "settings.appearance",
        icon: Palette,
        link: { to: "/profile", search: { section: "appearance" } },
      },
    ],
  },
  {
    labelKey: "settingsHub.installation",
    items: [
      {
        id: "general",
        labelKey: "settings.general.title",
        icon: Settings2,
        link: { to: "/settings", search: { section: "general" } },
      },
    ],
  },
];

const meta = {
  title: "Components/SectionNav",
  component: SectionNav,
  parameters: { route: "/profile" },
  decorators: [withWidth("narrow")],
  args: { labelKey: "settingsHub.nav", current: "account", groups },
} satisfies Meta<typeof SectionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = { args: { current: "security" } };

export const OtherGroupActive: Story = { args: { current: "general" } };
