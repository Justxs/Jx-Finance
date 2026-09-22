import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "@tanstack/react-router";
import { Palette, ShieldCheck, UserRound } from "lucide-react";
import { withWidth } from "@/storybook/decorators";
import { SectionNav, type SectionNavItem } from "./section-nav";

type Section = "account" | "security" | "appearance";

const sections: readonly Section[] = ["account", "security", "appearance"];

const items: Record<Section, SectionNavItem> = {
  account: { labelKey: "profile.detailsTitle", icon: UserRound },
  security: { labelKey: "profile.twoFactorTitle", icon: ShieldCheck },
  appearance: { labelKey: "settings.appearance", icon: Palette },
};

function ProfileSectionNav({ current }: Readonly<{ current: Section }>) {
  return (
    <SectionNav
      labelKey="profile.sectionsNav"
      current={current}
      sections={sections}
      items={items}
      renderLink={(section, props) => <Link to="/profile" search={{ section }} {...props} />}
    />
  );
}

const meta = {
  title: "Components/SectionNav",
  component: ProfileSectionNav,
  parameters: { route: "/profile" },
  decorators: [withWidth("w-[min(16rem,90vw)]")],
  args: { current: "account" },
} satisfies Meta<typeof ProfileSectionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = { args: { current: "security" } };
