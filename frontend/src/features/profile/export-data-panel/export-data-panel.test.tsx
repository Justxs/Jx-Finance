import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { createQueryWrapper } from "@/test/query";
import { ExportDataPanel } from "./export-data-panel";

test("links to the export and adds the attached files when ticked", () => {
  const { Wrapper } = createQueryWrapper();

  render(<ExportDataPanel />, { wrapper: Wrapper });

  const link = screen.getByRole("link", { name: "Download my data" });
  expect(link).toHaveAttribute("href", "/api/users/me/export");
  fireEvent.click(screen.getByRole("checkbox", { name: "Include attached files" }));
  expect(link).toHaveAttribute("href", "/api/users/me/export?attachments=true");
});
