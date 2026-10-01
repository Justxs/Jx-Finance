import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDeleteExchangeRateMockHandler,
  getExchangeRateEntriesMockHandler,
  getSetExchangeRateMockHandler,
} from "@/api/generated/settings/settings.msw";
import { withWidth } from "@/storybook/decorators";
import {
  exchangeRateEntries,
  exchangeRateFutureDateProblem,
  serverErrorProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption, openedDialog } from "@/storybook/interactions";
import { ExchangeRatesSection } from "./exchange-rates-section";

const meta = {
  title: "Features/Settings/ExchangeRatesSection",
  component: ExchangeRatesSection,
  parameters: { layout: "padded", route: "/settings?section=currencies" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof ExchangeRatesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("region", { name: "USD rates" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    await expect(within(list).getAllByText("Entered by hand")).toHaveLength(2);
    await expect(within(list).getByText("ECB rate 1.0831")).toBeVisible();
    await expect(within(list).getAllByRole("button", { name: /^Delete: / })).toHaveLength(2);
    await expect(within(list).getAllByRole("button", { name: /^Edit: / })).toHaveLength(4);
  },
};

export const Empty: Story = {
  parameters: withHandlers(getExchangeRateEntriesMockHandler([])),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("No USD rates from the last 30 days, and none entered by hand."),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getExchangeRateEntriesMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getExchangeRateEntriesMockHandler(failWith(serverErrorProblem))),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

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

export const SwitchesCurrency: Story = {
  parameters: withHandlers(
    getExchangeRateEntriesMockHandler(({ request }) =>
      new URL(request.url).searchParams.get("currency") === "gbp" ? [] : exchangeRateEntries,
    ),
  ),
  play: async ({ canvas }) => {
    await chooseOption(await canvas.findByLabelText("Currency"), /^GBP/);
    await expect(
      await canvas.findByText("No GBP rates from the last 30 days, and none entered by hand."),
    ).toBeVisible();
  },
};

export const EntersRate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Enter rate" }));
    const dialog = within(await openedDialog());
    await expect(dialog.getByText("Enter a USD rate")).toBeVisible();
    await fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "1.0875" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const RejectsZero: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Enter rate" }));
    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "0" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await expect(
      await dialog.findByText("Enter a number above zero with at most 8 decimal places."),
    ).toBeVisible();
  },
};

export const FutureDateRefused: Story = {
  parameters: withHandlers(getSetExchangeRateMockHandler(failWith(exchangeRateFutureDateProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Enter rate" }));
    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "1.0875" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await expect(await dialog.findByText("A rate cannot be dated after today.")).toBeVisible();
  },
};

export const OverridesSyncedRate: Story = {
  play: async ({ canvas }) => {
    const edits = await canvas.findAllByRole("button", { name: /^Edit: / });
    const first = edits[0];
    if (!first) {
      throw new Error("The edit button is missing.");
    }
    await userEvent.click(first);
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("USD per euro")).toHaveValue("1.0842");
  },
};

export const DeletesManualRate: Story = {
  parameters: withHandlers(getDeleteExchangeRateMockHandler()),
  play: async ({ canvas }) => {
    const deletes = await canvas.findAllByRole("button", { name: /^Delete: / });
    const first = deletes[0];
    if (!first) {
      throw new Error("The delete button is missing.");
    }
    await userEvent.click(first);
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};
