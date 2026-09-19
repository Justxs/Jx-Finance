import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { i18n } from "@/lib/i18n";
import { setLocale } from "@/stores/app-store";
import { LanguageToggle } from "./language-toggle";

afterEach(() => {
  setLocale("en");
});

test("offers the other language, labelled in that language", async () => {
  render(<LanguageToggle />);
  const toLithuanian = screen.getByRole("button", { name: "EN, Lietuvių" });

  expect(toLithuanian).toHaveAttribute("lang", "lt");
  expect(toLithuanian).toHaveTextContent("en");

  await userEvent.click(toLithuanian);

  expect(i18n.language).toBe("lt");
  expect(screen.getByRole("button", { name: "LT, English" })).toHaveTextContent("lt");
});
