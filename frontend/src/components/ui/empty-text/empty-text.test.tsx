import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { EmptyText } from "./empty-text";

test("shows its own message when nothing is filtered", () => {
  render(<EmptyText>No goals yet.</EmptyText>);

  expect(screen.getByText("No goals yet.")).toBeInTheDocument();
});

test("says nothing matched when filters hide every row", () => {
  render(<EmptyText filtered>No goals yet.</EmptyText>);

  expect(screen.queryByText("No goals yet.")).toBeNull();
  expect(screen.getByText("No rows match these filters.")).toBeInTheDocument();
});
