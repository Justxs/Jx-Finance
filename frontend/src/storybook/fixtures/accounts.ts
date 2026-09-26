import type { AccountResponse, ArchivedAccountResponse } from "@/api/generated/model";
import { ids } from "./base";

type BaseAccount = Omit<
  AccountResponse,
  "currentBalance" | "reportingBalance" | "holdingsValue" | "balances"
>;

type Defaulted = "scope" | "currency" | "householdId";

interface AccountSeed extends Omit<BaseAccount, Defaulted>, Partial<Pick<BaseAccount, Defaulted>> {
  balance: string;
}

export function withBalance(base: BaseAccount, amount: string): AccountResponse {
  return {
    ...base,
    currentBalance: amount,
    reportingBalance: amount,
    holdingsValue: "0.00",
    balances: [{ currency: base.currency, amount }],
  };
}

function account({ balance, ...seed }: AccountSeed): AccountResponse {
  return withBalance({ scope: "personal", currency: "eur", householdId: null, ...seed }, balance);
}

export const checkingAccount = account({
  id: ids.accounts.checking,
  name: "Swedbank einamoji",
  description: "Pagrindinė atlyginimo sąskaita",
  iban: "LT127300010123456789",
  type: "checking",
  startingBalance: "1250.00",
  balance: "2843.17",
  createdAt: "2025-01-04T09:15:00Z",
});

export const savingsAccount = account({
  id: ids.accounts.savings,
  name: "Taupomoji sąskaita",
  description: null,
  iban: "LT647044001231465456",
  type: "savings",
  startingBalance: "8000.00",
  balance: "12500.00",
  createdAt: "2025-01-04T09:20:00Z",
});

const cashAccount = account({
  id: ids.accounts.cash,
  name: "Grynieji",
  description: "Piniginė ir namų stalčius",
  iban: null,
  type: "cash",
  startingBalance: "100.00",
  balance: "185.50",
  createdAt: "2025-02-11T17:42:00Z",
});

export const sharedAccount = account({
  id: ids.accounts.shared,
  name: "Bendra šeimos sąskaita kasdienėms išlaidoms ir komunaliniams mokesčiams",
  description:
    "Į šią sąskaitą abu kas mėnesį pervedame po lygiai; iš jos mokame už maistą, komunalines paslaugas, būsto paskolą ir visus kitus bendrus namų ūkio pirkinius.",
  iban: "LT601010012345678901",
  type: "checking",
  startingBalance: "500.00",
  balance: "1620.40",
  createdAt: "2025-03-01T08:00:00Z",
  scope: "shared",
  householdId: ids.households.family,
});

export const brokerAccount: AccountResponse = {
  id: ids.accounts.broker,
  name: "Interactive Brokers",
  description: "Investicinė sąskaita keliomis valiutomis",
  iban: null,
  type: "investment",
  startingBalance: "5000.00",
  currentBalance: "5412.63",
  createdAt: "2025-05-19T10:05:00Z",
  scope: "personal",
  currency: "eur",
  balances: [
    { currency: "eur", amount: "2498.00" },
    { currency: "usd", amount: "2710.40" },
    { currency: "gbp", amount: "350.00" },
  ],
  reportingBalance: "15987.62",
  holdingsValue: "10574.99",
  householdId: null,
};

export const accounts: AccountResponse[] = [
  checkingAccount,
  savingsAccount,
  cashAccount,
  sharedAccount,
  brokerAccount,
];

export const archivedAccount: ArchivedAccountResponse = {
  id: ids.accounts.archived,
  name: "Senoji SEB kortelė",
  description: "Uždaryta perėjus į Swedbank",
  iban: "LT307044060001234567",
  type: "checking",
  startingBalance: "320.00",
  currency: "eur",
  scope: "personal",
  householdId: null,
  archivedAt: "2026-08-30T14:05:00Z",
  canRestore: true,
};

export const archivedSharedAccount: ArchivedAccountResponse = {
  id: ids.accounts.archivedShared,
  name: "Sodo išlaidos",
  description: null,
  iban: null,
  type: "cash",
  startingBalance: "0.00",
  currency: "eur",
  scope: "shared",
  householdId: ids.households.family,
  archivedAt: "2026-07-12T08:30:00Z",
  canRestore: false,
};

export const archivedAccounts: ArchivedAccountResponse[] = [archivedAccount, archivedSharedAccount];
