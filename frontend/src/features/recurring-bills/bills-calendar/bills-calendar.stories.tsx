import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  getBillsCalendarMockHandler,
  getSkipRecurringBillMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page";
import { withPageFrame } from "@/storybook/decorators";
import {
  dueSoonBill,
  emptyBillsCalendar,
  mortgageBill,
  overdueBill,
  serverErrorProblem,
  settingsWith,
  transferBill,
  unconfirmedBillsCalendar,
  unconfirmedOccurrence,
  unpricedBillsCalendar,
  variableBill,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { type Canvas, openedDialog } from "@/storybook/interactions";
import { BillsCalendar } from "./bills-calendar";

const skipped = fn();
const markDoneLabel = `Mark as done: ${dueSoonBill.name}`;

const meta = {
  title: "Features/RecurringBills/BillsCalendar",
  component: BillsCalendar,
  args: { onConfirm: fn(), onEdit: fn(), onMarkDone: fn() },
  parameters: { layout: "fullscreen", route: "/recurring-bills?view=calendar&month=2026-09" },
  decorators: [withPageFrame],
} satisfies Meta<typeof BillsCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

async function monthTable(canvas: Canvas) {
  return within(await canvas.findByRole("table", { name: "September 2026" }));
}

async function chipOf(canvas: Canvas, name: string) {
  const table = await monthTable(canvas);
  const [label] = await table.findAllByText(name);
  const chip = label?.closest<HTMLElement>("[data-slot=bill-chip]");
  if (!chip) {
    throw new Error(`no chip for ${name}`);
  }
  return chip;
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "September 2026" })).toBeVisible();
    await expect(await canvas.findByText("€696.59")).toBeVisible();
    await expect(canvas.getByText("Partly estimated")).toBeVisible();
    await expect(await chipOf(canvas, dueSoonBill.name)).toHaveTextContent("€24.99");
  },
};

export const Overdue: Story = {
  play: async ({ canvas }) => {
    await expect(await chipOf(canvas, overdueBill.name)).toHaveTextContent(/Overdue/u);
  },
};

export const VariableEstimate: Story = {
  play: async ({ canvas }) => {
    await expect(await chipOf(canvas, variableBill.name)).toHaveTextContent(/≈ Estimated €41\.20/u);
  },
};

export const PaidPastDay: Story = {
  play: async ({ canvas }) => {
    const table = await monthTable(canvas);
    const link = await table.findByRole("link", { name: mortgageBill.name });
    await expect(link).toHaveAttribute("href", expect.stringContaining("dateFrom=2026-09-05"));
    await expect(link).toHaveAttribute(
      "href",
      expect.stringContaining(`accountId=${mortgageBill.accountId}`),
    );
    await expect(await chipOf(canvas, mortgageBill.name)).toHaveTextContent(/Paid/u);
  },
};

export const PaidNotConfirmed: Story = {
  parameters: withHandlers(getBillsCalendarMockHandler(unconfirmedBillsCalendar)),
  play: async ({ canvas, args }) => {
    await expect(await chipOf(canvas, dueSoonBill.name)).toHaveTextContent(
      /€27\.99.*Paid.*Not confirmed/u,
    );
    const table = await monthTable(canvas);
    await userEvent.click(table.getByRole("button", { name: markDoneLabel }));
    await expect(args.onMarkDone).toHaveBeenCalledWith(unconfirmedOccurrence);
  },
};

export const MarksAPaidOccurrenceDone: Story = {
  render: () => <RecurringBillsPage />,
  parameters: withHandlers(
    getBillsCalendarMockHandler(unconfirmedBillsCalendar),
    getSkipRecurringBillMockHandler(async ({ request }) => {
      skipped(await readBody(request));
      return { ...dueSoonBill, nextDueDate: "2026-10-20" };
    }),
  ),
  play: async ({ canvas }) => {
    const table = await monthTable(canvas);
    await userEvent.click(await table.findByRole("button", { name: markDoneLabel }));
    await waitFor(() =>
      expect(skipped).toHaveBeenCalledWith({
        expectedDueDate: unconfirmedOccurrence.date,
        transactionId: unconfirmedOccurrence.transactionId,
      }),
    );
  },
};

export const NoMatch: Story = {
  play: async ({ canvas }) => {
    await expect(await chipOf(canvas, transferBill.name)).toHaveTextContent(/No match/u);
  },
};

export const WithoutAmount: Story = {
  parameters: withHandlers(getBillsCalendarMockHandler(unpricedBillsCalendar)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/1 entry without an amount/u)).toBeVisible();
    const table = await monthTable(canvas);
    await expect(await table.findByText("No amount")).toBeVisible();
  },
};

export const EmptyMonth: Story = {
  parameters: withHandlers(getBillsCalendarMockHandler(emptyBillsCalendar)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No recurring entries fall in this month.")).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getBillsCalendarMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getBillsCalendarMockHandler(failWith(serverErrorProblem))),
};

export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

async function firstWeekday(canvas: Canvas) {
  const table = await monthTable(canvas);
  return table.getAllByRole("columnheader")[0];
}

export const WeekStartsOnMonday: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ firstDayOfWeek: "monday" }))),
  play: async ({ canvas }) => {
    await waitFor(async () => expect(await firstWeekday(canvas)).toHaveTextContent("Mon"));
  },
};

export const WeekStartsOnSunday: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ firstDayOfWeek: "sunday" }))),
  play: async ({ canvas }) => {
    await waitFor(async () => expect(await firstWeekday(canvas)).toHaveTextContent("Sun"));
  },
};

export const ConfirmsTheNextDueOccurrence: Story = {
  render: () => <RecurringBillsPage />,
  play: async ({ canvas }) => {
    const table = await monthTable(canvas);
    await userEvent.click(
      await table.findByRole("button", { name: `Confirm: ${dueSoonBill.name}` }),
    );
    const dialog = within(await openedDialog());
    await expect(dialog.getByRole("heading", { name: "Confirm recurring entry" })).toBeVisible();
  },
};
