import type { SubscriptionCandidateResponse } from "@/api/generated/model";
import { ids } from "./base";

export const spotifyCandidate: SubscriptionCandidateResponse = {
  description: "spotify ab",
  accountId: ids.accounts.checking,
  categoryId: ids.categories.entertainment,
  cadence: "monthly",
  typicalAmount: "10.99",
  occurrenceDates: ["2026-06-14", "2026-07-14", "2026-08-14", "2026-09-14"],
  nextExpectedDate: "2026-10-14",
};

export const gymCandidate: SubscriptionCandidateResponse = {
  description: "lemon gym abonementas",
  accountId: ids.accounts.shared,
  categoryId: ids.categories.health,
  cadence: "monthly",
  typicalAmount: "29.99",
  occurrenceDates: ["2026-07-02", "2026-08-02", "2026-09-02"],
  nextExpectedDate: "2026-10-02",
};

export const domainCandidate: SubscriptionCandidateResponse = {
  description: "hostinger domenas",
  accountId: ids.accounts.checking,
  categoryId: null,
  cadence: "yearly",
  typicalAmount: "14.50",
  occurrenceDates: ["2024-11-08", "2025-11-08", "2026-11-08"],
  nextExpectedDate: "2027-11-08",
};

export const waterCandidate: SubscriptionCandidateResponse = {
  description: "vandens filtrai pristatymas",
  accountId: ids.accounts.shared,
  categoryId: ids.categories.householdGoods,
  cadence: "quarterly",
  typicalAmount: "37.40",
  occurrenceDates: ["2026-01-20", "2026-04-21", "2026-07-20"],
  nextExpectedDate: "2026-10-20",
};

export const subscriptionCandidates: SubscriptionCandidateResponse[] = [
  gymCandidate,
  spotifyCandidate,
  waterCandidate,
  domainCandidate,
];
