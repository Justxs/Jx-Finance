import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { adminNavPages, navPages } from "@/lib/navigation";
import { MobileNav } from "./mobile-nav";

const meta = {
  title: "Components/MobileNav",
  component: MobileNav,
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
  args: { pages: navPages },
} satisfies Meta<typeof MobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveRoute: Story = {
  parameters: { route: "/transactions" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

export const Administrator: Story = { args: { pages: [...navPages, ...adminNavPages] } };
