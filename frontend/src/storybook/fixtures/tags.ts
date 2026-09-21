import type { TagResponse } from "@/api/generated/model";
import { ids } from "./base";

function tag(id: string, name: string, householdId: string | null = null): TagResponse {
  return {
    id,
    name,
    scope: householdId ? "shared" : "personal",
    householdId,
  };
}

export const tags: TagResponse[] = [
  tag(ids.tags.holiday, "Atostogos 2026"),
  tag(ids.tags.renovation, "Buto remontas", ids.households.family),
  tag(ids.tags.reimbursable, "Kompensuotina"),
  tag(ids.tags.children, "Vaikams"),
  tag(ids.tags.car, "Automobilis"),
];
