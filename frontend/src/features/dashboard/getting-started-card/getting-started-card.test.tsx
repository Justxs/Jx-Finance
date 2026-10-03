import { screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { getGettingStartedQueryKey } from "@/api/generated";
import { getGettingStartedMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { gettingStartedDone } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { GettingStartedCard } from "./getting-started-card";

const api = mockApi();

test("open steps link to where they are done and finished steps are named as done", async () => {
  renderInApp(<GettingStartedCard />);

  expect(await screen.findByText("5 of 10 done")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Add an account" })).toBeNull();
  expect(screen.getByText("Add an account").closest("li")).toHaveTextContent(
    "Add an account, Done",
  );
  expect(screen.getByRole("link", { name: "Take a backup" })).toHaveAttribute(
    "href",
    "/settings?section=backups",
  );
});

test("the card leaves the dashboard once every step is done", async () => {
  api.use(getGettingStartedMockHandler(gettingStartedDone));
  const { queryClient } = renderInApp(<GettingStartedCard />);

  await waitFor(() =>
    expect(queryClient.getQueryData(getGettingStartedQueryKey())).toEqual(gettingStartedDone),
  );
  expect(screen.queryByRole("heading", { name: "Getting started" })).toBeNull();
});
