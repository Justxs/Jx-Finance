import type { Meta, StoryObj } from "@storybook/react-vite";
import { Palette, ShieldCheck, UserRound } from "lucide-react";
import { SectionNav } from "./section-nav";

const meta = {
  title: "Components/SectionNav",
  component: SectionNav,
  parameters: { route: "/profile" },
  decorators: [
    (Story) => (
      <div className="w-[min(16rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: {
    to: "/profile",
    label: "Profile sections",
    current: "account",
    items: [
      { id: "account", label: "Name and password", icon: UserRound },
      { id: "security", label: "Two-factor authentication", icon: ShieldCheck },
      { id: "appearance", label: "Appearance", icon: Palette },
    ],
  },
} satisfies Meta<typeof SectionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = { args: { current: "security" } };
