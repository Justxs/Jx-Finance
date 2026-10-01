import type {
  ContactEntryResponse,
  ContactResponse,
  ContactSplitResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { uid } from "./base";
import { problemOf } from "./problems";
import { sharedPurchase } from "./settle-up";

const jonas = uid("5c5c5c5c", 1);
const ona = uid("5c5c5c5c", 2);
const tomas = uid("5c5c5c5c", 3);

export const contacts: ContactResponse[] = [
  {
    id: jonas,
    name: "Jonas",
    balances: [
      { currency: "eur", amount: "42.50" },
      { currency: "usd", amount: "-12.00" },
    ],
  },
  { id: ona, name: "Ona", balances: [{ currency: "eur", amount: "-15.00" }] },
  { id: tomas, name: "Tomas", balances: [] },
];

export const contactEntries: ContactEntryResponse[] = [
  {
    id: uid("5d5d5d5d", 1),
    kind: "payment",
    date: "2026-09-16",
    description: "Grąžino dalį",
    amount: "20.00",
    currency: "eur",
    direction: "fromContact",
    counted: true,
  },
  {
    id: uid("5d5d5d5d", 2),
    kind: "split",
    date: "2026-09-12",
    description: "Vakarienė Senamiestyje",
    amount: "32.50",
    currency: "eur",
    direction: null,
    counted: true,
  },
  {
    id: uid("5d5d5d5d", 3),
    kind: "payment",
    date: "2026-09-05",
    description: "Paskola iki algos",
    amount: "30.00",
    currency: "eur",
    direction: "toContact",
    counted: true,
  },
  {
    id: uid("5d5d5d5d", 4),
    kind: "split",
    date: "2026-08-28",
    description: "Kino bilietai",
    amount: "8.00",
    currency: "eur",
    direction: null,
    counted: false,
  },
];

export const dinnerSplit: ContactSplitResponse = {
  id: uid("5e5e5e5e", 1),
  method: "equal",
  ownWeight: null,
  ownAmount: "30.00",
  shares: [
    { contactId: jonas, name: "Jonas", weight: null, amount: "30.00" },
    { contactId: ona, name: "Ona", weight: null, amount: "30.00" },
  ],
};

export const contactSplitPurchase: TransactionResponse = {
  ...sharedPurchase,
  description: "Vakarienė Senamiestyje",
  sharedExpense: null,
  contactSplit: dinnerSplit,
};

export const contactNoPersonProblem = problemOf(
  400,
  "contact.noPerson",
  "Split with at least one person.",
  {
    instance: "/api/contacts/splits",
    name: "shares",
  },
);
