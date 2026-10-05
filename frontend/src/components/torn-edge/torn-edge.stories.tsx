import type { Meta, StoryObj } from "@storybook/react-vite";
import { TornEdge } from "./torn-edge";

const meta = {
  title: "Components/TornEdge",
  component: TornEdge,
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="pb-16">
      <div className="relative isolate h-32 bg-hero">
        <TornEdge />
      </div>
    </div>
  ),
} satisfies Meta<typeof TornEdge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTheBand: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };
