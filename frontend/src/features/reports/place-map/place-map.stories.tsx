import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { reportSummaryYear } from "@/storybook/fixtures";
import { PlaceMap } from "./place-map";

const meta = {
  title: "Features/Reports/PlaceMap",
  component: PlaceMap,
  args: { items: reportSummaryYear.expenseByPlace, onSelect: fn() },
  decorators: [withWidth("card")],
} satisfies Meta<typeof PlaceMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: /^Map of spending by place: Maxima X/u }),
    ).toBeInTheDocument();
  },
};

export const NoCoordinates: Story = {
  args: {
    items: reportSummaryYear.expenseByPlace.map((item) => ({
      ...item,
      latitude: null,
      longitude: null,
    })),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/None of these places has a location yet/u)).toBeVisible();
  },
};
