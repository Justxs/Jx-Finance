import type { Meta, StoryObj } from "@storybook/react-vite";
import { DashboardSection } from "./dashboard-section";

const meta = {
  title: "Features/Dashboard/DashboardSection",
  component: DashboardSection,
  decorators: [
    (Story) => (
      <div className="w-[min(28rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Budgets this month",
    children: <p className="text-sm text-muted-foreground">Section content.</p>,
  },
} satisfies Meta<typeof DashboardSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLink: Story = { args: { to: "/budgets", linkLabel: "Budgets" } };

export const LongTitle: Story = {
  args: {
    title: "Mokėtina per artimiausius šešis mėnesius pagal kiekvieną sąskaitą",
    to: "/recurring-bills",
    linkLabel: "Periodiniai mokėjimai",
  },
};
