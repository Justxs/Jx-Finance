import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ErrorState } from "./error-state";

test("announces the failure without a retry by default", () => {
  render(<ErrorState />);

  expect(screen.getByRole("alert")).toHaveTextContent("Could not load this.");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("offers a retry when one is given", async () => {
  const onRetry = vi.fn();
  render(<ErrorState onRetry={onRetry} />);

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(onRetry).toHaveBeenCalledOnce();
});
