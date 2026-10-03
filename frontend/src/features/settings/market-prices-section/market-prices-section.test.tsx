import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  getSyncMarketPricesMockHandler,
  getUpdateMarketPriceSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import { marketPricesUnavailableProblem, serverErrorProblem } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { MarketPricesSection } from "./market-prices-section";

const api = mockApi();

test("replacing the saved key sends the new one and shows it saved again", async () => {
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("button", { name: "Replace" }));
  fireEvent.change(screen.getByLabelText("EODHD API key"), { target: { value: " new-key " } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Market price settings saved")).toBeInTheDocument();
  expect(await api.lastBody("PUT", "/api/settings/market-prices")).toEqual({
    enabled: true,
    eodhdApiKey: "new-key",
  });
  expect(await screen.findByText("Key saved")).toBeInTheDocument();
});

test("removing the key sends an empty key and asks for a new one", async () => {
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
  expect(screen.getByText("The key is removed when you save.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByLabelText("EODHD API key")).toHaveValue("");
  expect(await api.lastBody("PUT", "/api/settings/market-prices")).toEqual({
    enabled: true,
    eodhdApiKey: "",
  });
});

test("cancelling a removal keeps the key and saving leaves it untouched", async () => {
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Fetch closing prices daily" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(api.sent("PUT", "/api/settings/market-prices")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/settings/market-prices")).toEqual({
    enabled: false,
    eodhdApiKey: null,
  });
});

test("a failed save is shown in the form", async () => {
  api.use(getUpdateMarketPriceSettingsMockHandler(failWith(serverErrorProblem)));
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("checkbox", { name: "Fetch closing prices daily" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
});

test("fetching now reports what was checked and written", async () => {
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Fetch now/u }));

  expect(await screen.findByText("Checked 3, wrote 12 prices, 0 failed")).toBeInTheDocument();
  expect(api.sent("POST", "/api/settings/market-prices/sync")).toHaveLength(1);
});

test("a fetch while the provider is unreachable shows why", async () => {
  api.use(getSyncMarketPricesMockHandler(failWith(marketPricesUnavailableProblem)));
  renderInApp(<MarketPricesSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Fetch now/u }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The price source cannot be reached right now.",
  );
});
