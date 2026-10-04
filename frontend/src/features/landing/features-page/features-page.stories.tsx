import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { FeaturesPage, featureCount, featureGroups } from "./features-page";

const meta = {
  title: "Features/Landing/FeaturesPage",
  component: FeaturesPage,
  parameters: { layout: "fullscreen", route: "/features" },
} satisfies Meta<typeof FeaturesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "What Jx Finance can do" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(
      featureGroups.length,
    );
    await expect(canvas.getAllByText("For example:")).toHaveLength(featureCount);
    await expect(canvas.getByRole("heading", { name: "Budgets" })).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Net worth over the last six months, rising" }),
    ).toBeInTheDocument();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Dark: Story = { globals: { theme: "dark" } };
