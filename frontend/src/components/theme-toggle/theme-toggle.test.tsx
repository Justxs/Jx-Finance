import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { setTheme } from "@/stores/theme-store";
import { ThemeToggle } from "./theme-toggle";

afterEach(() => {
  setTheme("light");
});

test("flips the theme on the document", async () => {
  render(<ThemeToggle />);
  const toggle = screen.getByRole("button", { name: "Toggle theme" });

  await userEvent.click(toggle);
  expect(document.documentElement).toHaveClass("dark");

  await userEvent.click(toggle);
  expect(document.documentElement).not.toHaveClass("dark");
});
