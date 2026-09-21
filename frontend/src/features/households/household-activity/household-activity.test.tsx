import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { AuditEventResponse } from "@/api/generated/model";
import { householdAuditEvents } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { ActivityEvent, sentenceKey } from "./household-activity";

function eventAt(index: number): AuditEventResponse {
  const found = householdAuditEvents[index];
  if (!found) {
    throw new Error(`no fixture at ${index}`);
  }
  return found;
}

function renderEvent(event: AuditEventResponse) {
  const { Wrapper } = createQueryWrapper();
  return render(
    <ul>
      <ActivityEvent event={event} />
    </ul>,
    { wrapper: Wrapper },
  );
}

test("an edit names who changed what and lists each field with its old and new value", () => {
  renderEvent(eventAt(0));

  expect(screen.getByText("Transaction")).toBeInTheDocument();
  expect(screen.getByText("Šarūnas Kazlauskas changed Maxima, 42.18 EUR")).toBeInTheDocument();
  expect(
    screen.getByText("amount 40.00 EUR → 42.18 EUR, category Maistas → Maisto prekės"),
  ).toBeInTheDocument();
  expect(screen.getByRole("time")).toHaveAttribute("datetime", "2026-09-18T18:20:00Z");
});

test("an empty old value reads as none and an unknown field keeps its own name", () => {
  renderEvent({
    ...eventAt(10),
    changes: [
      { field: "tags", from: null, to: "Atostogos" },
      { field: "somethingNew", from: "a", to: "b" },
    ],
  });

  expect(screen.getByText("tags none → Atostogos, somethingNew a → b")).toBeInTheDocument();
});

test("a row without an actor name is attributed to a former user", () => {
  renderEvent({ ...eventAt(1), actorName: "" });

  expect(screen.getByText("A former user added Maxima, 40.00 EUR")).toBeInTheDocument();
});

test("the sentence depends on the kind for households, archived accounts and bulk edits", () => {
  const base = eventAt(0);

  expect(sentenceKey({ ...base, action: "updated", entityId: null })).toBe("bulkUpdated");
  expect(sentenceKey({ ...base, action: "deleted", entityKind: "account" })).toBe("archived");
  expect(sentenceKey({ ...base, action: "created", entityKind: "household" })).toBe(
    "createdHousehold",
  );
  expect(sentenceKey({ ...base, action: "deleted", entityKind: "household" })).toBe(
    "deletedHousehold",
  );
  expect(sentenceKey({ ...base, action: "restored", entityKind: "household" })).toBe(
    "restoredHousehold",
  );
  expect(sentenceKey({ ...base, action: "renamed", entityKind: "household" })).toBe("renamed");
  expect(sentenceKey({ ...base, action: "shared", entityKind: "account" })).toBe("shared");
});

test("a file added, removed and restored reads as attached, removed and restored", () => {
  const base = eventAt(0);

  expect(sentenceKey({ ...base, action: "created", entityKind: "attachment" })).toBe(
    "createdAttachment",
  );
  expect(sentenceKey({ ...base, action: "deleted", entityKind: "attachment" })).toBe(
    "deletedAttachment",
  );
  expect(sentenceKey({ ...base, action: "restored", entityKind: "attachment" })).toBe(
    "restoredAttachment",
  );

  renderEvent({
    ...base,
    action: "created",
    entityKind: "attachment",
    description: "receipt.png, Maxima, 40.00 EUR",
  });

  expect(screen.getByText(/attached receipt\.png, Maxima, 40\.00 EUR/)).toBeInTheDocument();
});
