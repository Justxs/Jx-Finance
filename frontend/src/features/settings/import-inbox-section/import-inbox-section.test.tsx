import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getImportInboxStatusMockHandler } from "@/api/generated/imports/imports.msw";
import { importInboxOff } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { ImportInboxSection } from "./import-inbox-section";

const api = mockApi();

test("without a folder the inbox explains how to turn it on and lists nothing", async () => {
  api.use(getImportInboxStatusMockHandler(importInboxOff));
  renderInApp(<ImportInboxSection />);

  expect(await screen.findByText(/^The inbox is off\./u)).toBeInTheDocument();
  expect(screen.queryByText("Watching")).toBeNull();
  expect(screen.queryByText("Files the inbox could not use")).toBeNull();
});
