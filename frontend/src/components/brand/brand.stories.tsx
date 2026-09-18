import type { Meta, StoryObj } from "@storybook/react-vite";
import { Brand, BrandMark } from "./brand";

const meta = {
  title: "Components/Brand",
  component: Brand,
  parameters: { providers: "none" },
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lockup: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const Large: Story = { args: { size: "lg" } };

export const Compact: Story = { args: { compact: true } };

export const Dark: Story = { globals: { theme: "dark" } };

export const MarkSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <BrandMark className="size-32" title="Jx Finance" />
      <BrandMark className="size-16" />
      <BrandMark className="size-8" />
      <BrandMark className="size-4" />
    </div>
  ),
};

export const OnSidebarSurface: Story = {
  render: () => (
    <div className="flex w-58 items-center bg-sidebar px-6 py-5">
      <Brand />
    </div>
  ),
};

export const ClearSpace: Story = {
  render: () => (
    <div className="inline-block border border-dashed p-8">
      <Brand size="lg" />
    </div>
  ),
};
