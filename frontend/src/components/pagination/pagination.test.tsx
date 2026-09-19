import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Pagination } from "./pagination";

test("a single page needs no pagination", () => {
  const { container } = render(<Pagination page={1} pages={1} onPageChange={vi.fn()} />);

  expect(container).toBeEmptyDOMElement();
});

test("shows the position and steps both ways", async () => {
  const onPageChange = vi.fn();
  render(<Pagination page={2} pages={5} onPageChange={onPageChange} />);

  expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Previous" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(onPageChange.mock.calls).toEqual([[1], [3]]);
});

test("the first page cannot go back and the last cannot go on", () => {
  const { rerender } = render(<Pagination page={1} pages={3} onPageChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

  rerender(<Pagination page={3} pages={3} onPageChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
