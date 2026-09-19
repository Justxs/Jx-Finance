import type { Meta, StoryObj } from "@storybook/react-vite";
import { Splash } from "./splash";

const meta = {
  title: "Components/Splash",
  component: Splash,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Splash>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
