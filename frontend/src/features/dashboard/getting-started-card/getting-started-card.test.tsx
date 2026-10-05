import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { getGettingStartedQueryKey } from "@/api/generated";
import { getGettingStartedMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { gettingStartedDone, gettingStartedFresh } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { GettingStartedCard } from "./getting-started-card";

const api = mockApi();

test("a fresh installation sees every step as a link to where it is done", async () => {
  api.use(getGettingStartedMockHandler(gettingStartedFresh));
  renderInApp(<GettingStartedCard />);

  expect(await screen.findByText("0 of 10 done")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Take a backup" })).toHaveAttribute(
    "href",
    "/settings?section=backups",
  );
  expect(screen.queryByRole("button", { name: "Show steps" })).toBeNull();
});

test("once half the steps are done the list folds behind a disclosure", async () => {
  renderInApp(<GettingStartedCard />);

  expect(await screen.findByText("5 of 10 done")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Take a backup" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Show steps" }));

  expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(screen.queryByRole("link", { name: "Add an account" })).toBeNull();
  expect(screen.getByText("Add an account").closest("li")).toHaveTextContent(
    "Add an account, Done",
  );
  expect(screen.getByRole("link", { name: "Take a backup" })).toBeVisible();
});

test("hiding the card saves it as hidden in the dashboard layout", async () => {
  renderInApp(<GettingStartedCard />);

  fireEvent.click(await screen.findByRole("button", { name: "Hide card" }));

  await waitFor(() => expect(api.sent("PUT", "/api/users/me/dashboard-layout")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/users/me/dashboard-layout")).toMatchObject({
    hidden: ["gettingStarted"],
  });
});

test("the card leaves the dashboard once every step is done", async () => {
  api.use(getGettingStartedMockHandler(gettingStartedDone));
  const { queryClient } = renderInApp(<GettingStartedCard />);

  await waitFor(() =>
    expect(queryClient.getQueryData(getGettingStartedQueryKey())).toEqual(gettingStartedDone),
  );
  expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
});
