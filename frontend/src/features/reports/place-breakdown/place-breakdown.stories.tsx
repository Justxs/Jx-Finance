import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  reportSummaryMonth,
  reportSummaryMonthCompared,
  reportSummaryYear,
} from "@/storybook/fixtures";
import { mapTilesPresentHandler, withHandlers } from "@/storybook/handlers";
import { PlaceBreakdown } from "./place-breakdown";

const withoutCoordinates = reportSummaryYear.expenseByPlace.map((item) => ({
  ...item,
  latitude: null,
  longitude: null,
}));

const meta = {
  title: "Features/Reports/PlaceBreakdown",
  component: PlaceBreakdown,
  args: { items: reportSummaryMonth.expenseByPlace, dateFrom: "2026-09-01", dateTo: "2026-09-30" },
  parameters: { route: "/reports" },
  decorators: [withWidth("card")],
} satisfies Meta<typeof PlaceBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const place = await canvas.findByRole("link", { name: "Maxima X, Ukmergės g. 282, Vilnius" });
    await expect(place).toHaveAttribute("href", expect.stringContaining("place="));
    await expect(canvas.getByText("No place")).toBeVisible();
    await expect(canvas.queryByRole("radiogroup", { name: "View" })).toBeNull();
  },
};

export const Year: Story = { args: { items: reportSummaryYear.expenseByPlace } };

export const ComparedWithAnEarlierPeriod: Story = {
  args: { items: reportSummaryMonthCompared.expenseByPlace },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText(/^(was|buvo) /i)).length).toBeGreaterThan(0);
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No place spending in this period.")).toBeVisible();
  },
};

export const MapWithPlaces: Story = {
  args: { items: reportSummaryYear.expenseByPlace },
  parameters: withHandlers(mapTilesPresentHandler),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "Map" }));

    await waitFor(() => expect(canvas.queryByRole("link", { name: /Maxima X/u })).toBeNull());

    await userEvent.click(canvas.getByRole("radio", { name: "List" }));
    await expect(await canvas.findByRole("link", { name: /Maxima X/u })).toBeVisible();
  },
};

export const MapWithoutCoordinates: Story = {
  args: { items: withoutCoordinates },
  parameters: withHandlers(mapTilesPresentHandler),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "Map" }));

    await expect(await canvas.findByText(/None of these places has a location yet/u)).toBeVisible();
  },
};

export const TileFileMissing: Story = {
  args: { items: reportSummaryYear.expenseByPlace },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: /Maxima X/u })).toBeVisible();
    await expect(canvas.queryByRole("radio", { name: "Map" })).toBeNull();
  },
};
