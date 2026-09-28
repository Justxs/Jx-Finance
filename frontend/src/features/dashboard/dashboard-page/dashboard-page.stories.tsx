import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getDashboardLayoutMockHandler,
  getMonthlyTrendMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { savePreferences } from "@/stores/preferences";
import { withPageFrame } from "@/storybook/decorators";
import {
  allHiddenDashboardLayout,
  customDashboardLayout,
  hiddenCardsDashboardLayout,
  MONTH_CLOSE_MONTH,
  serverErrorProblem,
  settingsWith,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import type { Canvas } from "@/storybook/interactions";
import { DashboardPage } from "./dashboard-page";

const meta = {
  title: "Features/Dashboard/DashboardPage",
  component: DashboardPage,
  parameters: { layout: "fullscreen" },
  decorators: [withPageFrame],
  beforeEach: () => {
    savePreferences({ monthClosePromptHidden: MONTH_CLOSE_MONTH });
  },
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const trendTitle = /^(income vs\. expenses|pajamos ir išlaidos)$/i;
const accountsTitle = /^(balance by account|likutis pagal sąskaitą)$/i;
const budgetsTitle = /^(budgets in their window|biudžetai savo lange)$/i;

async function cardHeadings(canvas: Canvas) {
  await canvas.findAllByRole("heading", { level: 2 });
  return canvas.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const PartialFailure: Story = {
  parameters: withHandlers(getMonthlyTrendMockHandler(failWith(serverErrorProblem))),
};

export const AllSectionsLoad: Story = {
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole("heading", {
      name: /recent transactions|paskutinės operacijos/i,
    });
    const recent = within(heading.closest("section")!);

    await expect((await recent.findAllByRole("listitem")).length).toBeGreaterThan(0);
    await expect(canvas.queryAllByRole("alert")).toHaveLength(0);
  },
};

export const RetryRecoversFailedSection: Story = {
  parameters: withHandlers(
    getMonthlyTrendMockHandler(failWith(serverErrorProblem), { once: true }),
  ),
  play: async ({ canvas }) => {
    const failed = await canvas.findByRole("alert");
    await expect(failed).toHaveTextContent(/income vs\. expenses|pajamos ir išlaidos/i);

    await userEvent.click(
      within(failed).getByRole("button", { name: /try again|bandyti dar kartą/i }),
    );

    await waitFor(() => expect(canvas.queryAllByRole("alert")).toHaveLength(0));
  },
};

export const CustomOrder: Story = {
  parameters: withHandlers(getDashboardLayoutMockHandler(customDashboardLayout)),
  play: async ({ canvas }) => {
    const headings = await cardHeadings(canvas);
    await expect(headings[0]).toMatch(accountsTitle);
  },
};

export const HiddenCards: Story = {
  parameters: withHandlers(getDashboardLayoutMockHandler(hiddenCardsDashboardLayout)),
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 2, name: accountsTitle });
    await expect(canvas.queryByRole("heading", { name: trendTitle })).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("heading", { name: /recent transactions|paskutinės operacijos/i }),
    ).not.toBeInTheDocument();
  },
};

export const AllHidden: Story = {
  parameters: withHandlers(getDashboardLayoutMockHandler(allHiddenDashboardLayout)),
  play: async ({ canvas }) => {
    await canvas.findByText(/every card is hidden|visos kortelės paslėptos/i);
    await expect(canvas.queryAllByRole("heading", { level: 2 })).toHaveLength(0);

    await expect(
      canvas.getByRole("link", { name: /choose cards|pasirinkti korteles/i }),
    ).toHaveAttribute("href", "/profile?section=dashboard");
  },
};

export const FeatureSwitchedOff: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ features: { budgets: false } }))),
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 2, name: accountsTitle });
    await expect(canvas.queryByRole("heading", { name: budgetsTitle })).not.toBeInTheDocument();
  },
};

export const LayoutUnavailable: Story = {
  parameters: withHandlers(getDashboardLayoutMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /dashboard layout|suvestinės išdėstymas/i,
    );
  },
};

export const MonthReadyToClose: Story = {
  beforeEach: () => {
    savePreferences({ monthClosePromptHidden: undefined });
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 2, name: /ready to close|galima uždaryti/i }),
    ).toBeVisible();
  },
};
