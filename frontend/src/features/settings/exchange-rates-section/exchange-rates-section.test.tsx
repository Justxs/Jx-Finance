import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  getExchangeRateEntriesMockHandler,
  getSetExchangeRateMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  exchangeRateEntries,
  exchangeRateFutureDateProblem,
  FIXTURE_TODAY,
} from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { chooseOption, first, openedDialog } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { ExchangeRatesSection } from "./exchange-rates-section";

const api = mockApi();

async function usdRates() {
  return within(await screen.findByRole("region", { name: "USD rates" }));
}

async function openNewRate() {
  fireEvent.click(await screen.findByRole("button", { name: "Enter rate" }));
  return within(await openedDialog());
}

test("only rates entered by hand can be deleted, every rate can be edited", async () => {
  renderInApp(<ExchangeRatesSection />);

  const list = await usdRates();
  expect(list.getAllByRole("listitem")).toHaveLength(exchangeRateEntries.length);
  expect(list.getAllByRole("button", { name: /^Edit: / })).toHaveLength(4);
  expect(list.getAllByRole("button", { name: /^Delete: / })).toHaveLength(2);
  expect(list.getByText("1 EUR = 1.0842 USD")).toBeInTheDocument();
});

test("a new rate is sent with a decimal point for the chosen currency and the dialog closes", async () => {
  const sent = vi.fn();
  api.use(
    getSetExchangeRateMockHandler(async ({ request, params }) => {
      sent(params.currency, await request.json());
      return {
        date: FIXTURE_TODAY,
        currency: "usd",
        rate: "1.5",
        source: "manual",
        syncedRate: null,
      };
    }),
  );
  renderInApp(<ExchangeRatesSection />);

  const dialog = await openNewRate();
  expect(dialog.getByText("Enter a USD rate")).toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "1,5" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(sent).toHaveBeenCalledWith("usd", { rate: "1.5" });
});

test("a zero rate is refused on the field and nothing is sent", async () => {
  renderInApp(<ExchangeRatesSection />);

  const dialog = await openNewRate();
  fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "0" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  expect(
    await dialog.findByText("Enter a number above zero with at most 8 decimal places."),
  ).toBeInTheDocument();
  expect(dialog.getByLabelText("USD per euro")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("a date the server refuses is marked on the date field and the dialog stays open", async () => {
  api.use(getSetExchangeRateMockHandler(failWith(exchangeRateFutureDateProblem)));
  renderInApp(<ExchangeRatesSection />);

  const dialog = await openNewRate();
  fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "1.0875" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  expect(await dialog.findByText("A rate cannot be dated after today.")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("editing an ECB rate starts from its value and saves a manual rate for its day", async () => {
  renderInApp(<ExchangeRatesSection />);

  const list = await usdRates();
  fireEvent.click(first(list.getAllByRole("button", { name: /^Edit: / })));
  const dialog = within(await openedDialog());
  expect(dialog.getByLabelText("USD per euro")).toHaveValue("1.0842");
  fireEvent.change(dialog.getByLabelText("USD per euro"), { target: { value: "1.0850" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(await api.lastBody("PUT", `/api/settings/exchange-rates/usd/${FIXTURE_TODAY}`)).toEqual({
    rate: "1.0850",
  });
});

test("cancelling a delete keeps the rate and sends nothing", async () => {
  renderInApp(<ExchangeRatesSection />);

  const list = await usdRates();
  fireEvent.click(first(list.getAllByRole("button", { name: /^Delete: / })));
  const dialog = within(await openedDialog("alertdialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("DELETE", "/api/settings/exchange-rates/usd/2026-09-17")).toHaveLength(0);
});

test("confirming a delete removes the manual rate of that day", async () => {
  renderInApp(<ExchangeRatesSection />);

  const list = await usdRates();
  fireEvent.click(first(list.getAllByRole("button", { name: /^Delete: / })));
  const dialog = within(await openedDialog("alertdialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Delete" }));

  await waitFor(() =>
    expect(api.sent("DELETE", "/api/settings/exchange-rates/usd/2026-09-17")).toHaveLength(1),
  );
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("choosing another currency lists that currency's rates", async () => {
  api.use(
    getExchangeRateEntriesMockHandler(({ request }) =>
      new URL(request.url).searchParams.get("currency") === "gbp" ? [] : exchangeRateEntries,
    ),
  );
  renderInApp(<ExchangeRatesSection />);

  await chooseOption(await screen.findByLabelText("Currency"), /^GBP/u);

  expect(
    await screen.findByText("No GBP rates from the last 30 days, and none entered by hand."),
  ).toBeInTheDocument();
});
