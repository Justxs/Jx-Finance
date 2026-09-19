import { QueryClient, QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { QueryBoundary } from "./query-boundary";

function Balance({ load }: Readonly<{ load: () => Promise<string> }>) {
  const balance = useSuspenseQuery({ queryKey: ["balance"], queryFn: load, retry: false });
  return <p>Balance {balance.data}</p>;
}

function Broken(): ReactNode {
  throw new Error("broken");
}

function renderBoundary(children: ReactNode, props: { errorFallback?: ReactNode } = {}) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <QueryBoundary fallback={<p>Loading</p>} {...props}>
        {children}
      </QueryBoundary>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

test("shows the fallback, then the content", async () => {
  renderBoundary(<Balance load={() => Promise.resolve("€10")} />);

  expect(screen.getByText("Loading")).toBeInTheDocument();
  expect(await screen.findByText("Balance €10")).toBeInTheDocument();
  expect(screen.queryByText("Loading")).not.toBeInTheDocument();
});

test("a failed query offers a retry that refetches", async () => {
  const load = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce("€10");
  renderBoundary(<Balance load={load} />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this.");

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(await screen.findByText("Balance €10")).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(2);
});

test("a custom error fallback replaces the retry state", async () => {
  renderBoundary(<Balance load={() => Promise.reject(new Error("offline"))} />, {
    errorFallback: <p>Unavailable</p>,
  });

  expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("render errors outside queries are caught too", async () => {
  renderBoundary(<Broken />);

  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
