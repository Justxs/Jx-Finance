import type {
  AuditAction,
  AuditChangeResponse,
  AuditEntityKind,
  AuditEventResponse,
} from "@/api/generated/model";
import { ids, uid } from "./base";
import { currentUser, memberUser } from "./users";

interface EventInput {
  actor?: "ruta" | "sarunas";
  action: AuditAction;
  kind: AuditEntityKind;
  entityId?: string | null;
  description: string;
  count?: number | null;
  changes?: AuditChangeResponse[];
}

const actors = {
  ruta: { actorUserId: ids.users.ruta, actorName: currentUser.displayName },
  sarunas: { actorUserId: ids.users.sarunas, actorName: memberUser.displayName },
};

function event(index: number, occurredAt: string, input: EventInput): AuditEventResponse {
  return {
    id: uid("a0d1a0d1", index),
    occurredAt,
    ...actors[input.actor ?? "sarunas"],
    action: input.action,
    entityKind: input.kind,
    entityId: input.entityId === undefined ? uid("e0e0e0e0", index) : input.entityId,
    description: input.description,
    count: input.count ?? null,
    changes: input.changes ?? [],
  };
}

export const householdAuditEvents: AuditEventResponse[] = [
  event(1, "2026-09-18T18:20:00Z", {
    action: "updated",
    kind: "transaction",
    entityId: ids.transactions.maxima,
    description: "Maxima, 42.18 EUR",
    changes: [
      { field: "amount", from: "40.00 EUR", to: "42.18 EUR" },
      { field: "category", from: "Maistas", to: "Maisto prekės" },
    ],
  }),
  event(2, "2026-09-18T18:12:00Z", {
    action: "created",
    kind: "transaction",
    entityId: ids.transactions.maxima,
    description: "Maxima, 40.00 EUR",
  }),
  event(3, "2026-09-18T09:05:00Z", {
    actor: "ruta",
    action: "imported",
    kind: "transaction",
    entityId: ids.accounts.shared,
    description: "Swedbank CSV into Bendra sąskaita, 42 entries, 3 duplicates skipped",
    count: 42,
  }),
  event(4, "2026-09-17T20:45:00Z", {
    action: "restored",
    kind: "transfer",
    description: "Pervedimas į santaupas, 200.00 EUR",
  }),
  event(5, "2026-09-17T20:41:00Z", {
    action: "deleted",
    kind: "transfer",
    description: "Pervedimas į santaupas, 200.00 EUR",
  }),
  event(6, "2026-09-16T11:27:00Z", {
    actor: "ruta",
    action: "shared",
    kind: "account",
    entityId: ids.accounts.shared,
    description: "Bendra sąskaita",
  }),
  event(7, "2026-09-16T11:20:00Z", {
    actor: "ruta",
    action: "updated",
    kind: "transaction",
    entityId: null,
    description: "Category set to Maistas, 12 transactions",
    count: 12,
  }),
  event(8, "2026-09-15T07:02:00Z", {
    actor: "ruta",
    action: "memberRoleChanged",
    kind: "member",
    entityId: ids.users.sarunas,
    description: memberUser.displayName,
    changes: [{ field: "role", from: "member", to: "owner" }],
  }),
  event(9, "2026-09-15T07:00:00Z", {
    actor: "ruta",
    action: "memberAdded",
    kind: "member",
    entityId: ids.users.sarunas,
    description: memberUser.displayName,
  }),
  event(10, "2026-09-12T16:55:00Z", {
    actor: "ruta",
    action: "renamed",
    kind: "household",
    entityId: ids.households.family,
    description: "Kazlauskų šeima",
    changes: [{ field: "name", from: "Šeima", to: "Kazlauskų šeima" }],
  }),
  event(11, "2026-09-12T16:50:00Z", {
    action: "updated",
    kind: "transaction",
    description: "Rimi, 18.40 EUR",
    changes: [{ field: "tags", from: null, to: "Atostogos, Kelionės" }],
  }),
  event(12, "2026-09-10T12:20:00Z", {
    actor: "ruta",
    action: "deleted",
    kind: "account",
    description: "Senoji kortelė",
  }),
  event(13, "2026-09-01T08:00:00Z", {
    actor: "ruta",
    action: "created",
    kind: "household",
    entityId: ids.households.family,
    description: "Šeima",
  }),
];
