import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Meter } from "./meter";

function fill(container: HTMLElement) {
  const element = container.firstElementChild?.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new TypeError("expected the meter fill");
  }
  return element;
}

test("a labelled meter exposes its value", () => {
  const { container } = render(<Meter value={30} max={120} label="Groceries budget" />);
  const meter = screen.getByRole("meter", { name: "Groceries budget" });

  expect(meter).toHaveAttribute("aria-valuemin", "0");
  expect(meter).toHaveAttribute("aria-valuemax", "120");
  expect(meter).toHaveAttribute("aria-valuenow", "30");
  expect(fill(container).style.width).toBe("25%");
});

test("an unlabelled meter is decorative", () => {
  const { container } = render(<Meter value={1} max={2} />);

  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
});

test("overspending caps at full", () => {
  const { container } = render(<Meter value={150} max={100} label="Budget" />);

  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  expect(fill(container).style.width).toBe("100%");
});

test.each([
  [-5, 100],
  [5, 0],
  [5, -10],
])("value %i of %i draws empty", (value, max) => {
  const { container } = render(<Meter value={value} max={max} />);

  expect(fill(container).style.width).toBe("0%");
});

test("tone picks the fill colour", () => {
  const { container } = render(<Meter value={1} max={2} tone="negative" />);

  expect(fill(container)).toHaveClass("bg-destructive");
});
