import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { publicSettings } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { Brand, BrandMark } from "./brand";

const longInstanceName =
  "Pranauskų šeimos namų ūkio buhalterija – Vilniaus, Kauno ir Klaipėdos būstų bei bendrų sąskaitų apskaita";

const meta = {
  title: "Components/Brand",
  component: Brand,
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lockup: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const Large: Story = { args: { size: "lg" } };

export const Stacked: Story = { args: { size: "lg", stacked: true } };

export const Compact: Story = { args: { compact: true } };

export const Dark: Story = { globals: { theme: "dark" } };

export const MarkSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <BrandMark className="h-32" title="Jx Finance" />
      <BrandMark className="h-16" />
      <BrandMark className="h-8" />
      <BrandMark className="h-4" />
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

export const LongInstallationName: Story = {
  parameters: withHandlers(
    getPublicSettingsMockHandler({ ...publicSettings, instanceName: longInstanceName }),
  ),
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex w-58 items-center bg-sidebar px-6 py-5">
        <Brand />
      </div>
      <div className="w-96 max-w-full">
        <Brand size="lg" stacked />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const names = await canvas.findAllByTitle(longInstanceName);
    await expect(names[0]).toHaveClass("truncate");
    await expect(names[1]).toHaveClass("line-clamp-2");
  },
};

export const ClearSpace: Story = {
  render: () => (
    <div className="inline-block border border-dashed p-8">
      <Brand size="lg" />
    </div>
  ),
};
