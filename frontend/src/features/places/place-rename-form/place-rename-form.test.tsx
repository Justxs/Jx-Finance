import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ownPlaces } from "@/storybook/fixtures";
import { renderWithQuery } from "@/test/query";
import { PlaceRenameForm } from "./place-rename-form";

const maximaSpellings = ownPlaces.filter((place) => place.name.startsWith("Maxima"));

test("a merge starts from the most used spelling and counts every row that will change", () => {
  renderWithQuery(
    <PlaceRenameForm places={maximaSpellings.toReversed()} onClose={vi.fn()} onRenamed={vi.fn()} />,
  );

  expect(screen.getByRole("textbox", { name: "Place" })).toHaveValue(
    "Maxima X, Ukmergės g. 282, Vilnius",
  );
  expect(screen.getByText("17 transactions you entered will read this place.")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Merge" })).toBeInTheDocument();
});

test("a rename of one place lists no spellings and offers Rename", () => {
  renderWithQuery(
    <PlaceRenameForm places={maximaSpellings.slice(1, 2)} onClose={vi.fn()} onRenamed={vi.fn()} />,
  );

  expect(screen.getByRole("textbox", { name: "Place" })).toHaveValue("Maxima Ukmerges");
  expect(screen.getByText("2 transactions you entered will read this place.")).toBeInTheDocument();
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
});
