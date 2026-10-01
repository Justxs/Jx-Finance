import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { savePreferences } from "@/stores/preferences";
import { withWidth } from "@/storybook/decorators";
import {
  buildDebtSchedule,
  linearDebt,
  mortgageSchedule,
  mortgageScheduleWithExtra,
  mortgageScheduleWithLumpSum,
} from "@/storybook/fixtures";
import { DebtExtraPayments, noExtraPayments } from "./debt-extra-payments";

const meta = {
  title: "Features/NetWorth/DebtExtraPayments",
  component: DebtExtraPayments,
  args: {
    currency: "eur",
    idPrefix: "extra",
    draft: noExtraPayments,
    schedule: mortgageSchedule,
    onChange: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtExtraPayments>;

export default meta;
type Story = StoryObj<typeof meta>;

const lumpSumDraft = { extraMonthly: "", lumpSum: "10000.00", lumpSumDate: "2026-10-01" };

export const Default: Story = {};

export const WithSavings: Story = {
  args: {
    draft: { ...noExtraPayments, extraMonthly: "150.00" },
    schedule: mortgageScheduleWithExtra,
  },
};

export const ShorterTermOrLowerPayment: Story = {
  args: { draft: lumpSumDraft, schedule: mortgageScheduleWithLumpSum },
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent(/shorter term|trumpesnis terminas/i);
    await expect(status).toHaveTextContent(/lower payment|mažesnė įmoka/i);
    await expect(status).toHaveTextContent(/instead of|vietoj/i);
  },
};

export const LinearLowerPayment: Story = {
  args: {
    currency: linearDebt.currency,
    draft: { extraMonthly: "", lumpSum: "2000.00", lumpSumDate: "2026-10-01" },
    schedule: buildDebtSchedule(linearDebt, { lumpSum: "2000.00", lumpSumDate: "2026-10-01" }),
  },
};

export const HiddenAmounts: Story = {
  args: { draft: lumpSumDraft, schedule: mortgageScheduleWithLumpSum },
  beforeEach: () => {
    savePreferences({ amountsHidden: true });
    return () => {
      savePreferences({ amountsHidden: false });
    };
  },
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("•••••");
    await expect(status).not.toHaveTextContent(/€\s?\d|\d\s?€/);
  },
};

export const Phone: Story = {
  args: { draft: lumpSumDraft, schedule: mortgageScheduleWithLumpSum },
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

export const InvalidAmount: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/extra each month|papildomai kas mėnesį/i);
    await userEvent.type(input, "abc");
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const LumpSumNeedsADate: Story = {
  args: { draft: { ...noExtraPayments, lumpSum: "5000" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/pick the date of the one-off payment|pasirinkite vienkartinės/i),
    ).toBeInTheDocument();
  },
};
