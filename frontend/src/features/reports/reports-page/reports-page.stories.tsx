import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { presetRange } from "../report-filters";
import { ReportsPage } from "./reports-page";

const today = new Date();

function routeFor(range: { dateFrom: string; dateTo: string }) {
  return `/reports?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`;
}

const meta = {
  title: "Features/Reports/ReportsPage",
  component: ReportsPage,
  parameters: { layout: "fullscreen", route: "/reports" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-[40rem] w-full" />}>
        <ReportsPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ReportsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThisMonth: Story = {};

export const LastMonth: Story = {
  parameters: { route: routeFor(presetRange("lastMonth", today)) },
};

export const ThisYearWithMonthBuckets: Story = {
  parameters: { route: routeFor(presetRange("thisYear", today)) },
};

export const LastYear: Story = { parameters: { route: routeFor(presetRange("lastYear", today)) } };

export const CustomRange: Story = {
  parameters: { route: routeFor({ dateFrom: "2026-08-10", dateTo: "2026-09-12" }) },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const EmptyYearWithoutNetWorthHistory: Story = {
  parameters: { route: routeFor(presetRange("thisYear", today)), msw: { handlers: emptyHandlers } },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const ChangesPreset: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preset = await canvas.findByRole("combobox", { name: /^(range|laikotarpis)$/i });
    await expect(preset).toHaveTextContent(/this month|šis mėnuo/i);

    await chooseOption(preset, /last year|praėję metai/i);

    await waitFor(() => expect(preset).toHaveTextContent(/last year|praėję metai/i));
    await expect(
      await canvas.findByRole("heading", { name: /net worth change|grynosios vertės pokytis/i }),
    ).toBeVisible();
  },
};

export const CategoryLinksCarryTheRange: Story = {
  parameters: { route: routeFor({ dateFrom: "2026-08-10", dateTo: "2026-09-12" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const section = await canvas.findByRole("heading", {
      name: /expense by category|išlaidos pagal kategoriją/i,
    });
    const links = within(section.closest("section")!).getAllByRole("link");

    const targets = links.map((link) => link.getAttribute("href") ?? "");

    await expect(targets.length).toBeGreaterThan(0);
    await expect(
      targets.filter(
        (href) => !href.includes("dateFrom=2026-08-10") || !href.includes("dateTo=2026-09-12"),
      ),
    ).toEqual([]);
  },
};
