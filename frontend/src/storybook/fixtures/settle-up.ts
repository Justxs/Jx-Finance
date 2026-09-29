import type {
  AccountResponse,
  HouseholdSettlementResponse,
  SettleUpResponse,
  SharedExpenseResponse,
  TransactionResponse,
  TransactionSharedExpenseResponse,
} from "@/api/generated/model";
import { checkingAccount, withBalance } from "./accounts";
import { ids, uid } from "./base";
import { problemOf } from "./problems";
import { refundedPurchase } from "./transactions";
import { currentUser, memberUser } from "./users";

const { ruta, sarunas } = ids.users;
const rutaName = currentUser.displayName;
const sarunasName = memberUser.displayName;

export const settleUp: SettleUpResponse = {
  balances: [
    { userId: ruta, name: rutaName, isMember: true, currency: "eur", amount: "42.50" },
    { userId: sarunas, name: sarunasName, isMember: true, currency: "eur", amount: "-42.50" },
    { userId: sarunas, name: sarunasName, isMember: true, currency: "usd", amount: "12.00" },
    { userId: ruta, name: rutaName, isMember: true, currency: "usd", amount: "-12.00" },
  ],
  payments: [
    {
      fromUserId: sarunas,
      fromName: sarunasName,
      toUserId: ruta,
      toName: rutaName,
      currency: "eur",
      amount: "42.50",
    },
    {
      fromUserId: ruta,
      fromName: rutaName,
      toUserId: sarunas,
      toName: sarunasName,
      currency: "usd",
      amount: "12.00",
    },
  ],
};

export const evenSettleUp: SettleUpResponse = { balances: [], payments: [] };

const groceries: TransactionResponse = { ...refundedPurchase, refundedAmount: null };

const maximaSplit: SharedExpenseResponse = {
  id: uid("5a5a5a5a", 1),
  payerId: ruta,
  payerName: rutaName,
  date: "2026-09-13",
  description: "Maxima, savaitės pirkiniai",
  amount: "90.00",
  currency: "eur",
  method: "equal",
  shares: [
    { userId: ruta, name: rutaName, weight: null, amount: "45.00" },
    { userId: sarunas, name: sarunasName, weight: null, amount: "45.00" },
  ],
  myShare: "45.00",
  counted: true,
  transactionId: groceries.id,
  amountDiffers: false,
};

export const sharedExpenses: SharedExpenseResponse[] = [
  maximaSplit,
  {
    id: uid("5a5a5a5a", 2),
    payerId: sarunas,
    payerName: sarunasName,
    date: "2026-09-08",
    description: "Bilietai į koncertą",
    amount: "7.50",
    currency: "eur",
    method: "shares",
    shares: [
      { userId: ruta, name: rutaName, weight: 2, amount: "5.00" },
      { userId: sarunas, name: sarunasName, weight: 1, amount: "2.50" },
    ],
    myShare: "5.00",
    counted: false,
    transactionId: null,
    amountDiffers: null,
  },
];

export const householdSettlements: HouseholdSettlementResponse[] = [
  {
    id: uid("5b5b5b5b", 1),
    fromUserId: sarunas,
    fromName: sarunasName,
    toUserId: ruta,
    toName: rutaName,
    amount: "20.00",
    currency: "eur",
    date: "2026-09-15",
    note: "Už rugpjūčio pirkinius",
    hasTransfer: true,
  },
];

export const partnerSharedAccount: AccountResponse = withBalance(
  {
    ...checkingAccount,
    id: uid("33333333", 20),
    name: "Šarūno Luminor sąskaita",
    description: null,
    iban: "LT214010051001234567",
    scope: "shared",
    householdId: ids.households.family,
    ownerId: sarunas,
  },
  "640.00",
);

const marker: TransactionSharedExpenseResponse = {
  id: maximaSplit.id,
  householdId: ids.households.family,
  householdName: "Kazlauskų šeima",
  method: "equal",
  shares: maximaSplit.shares,
  myShare: "45.00",
  amountDiffers: false,
};

export const sharedPurchase: TransactionResponse = {
  ...groceries,
  accountId: checkingAccount.id,
  amount: "90.00",
  reportingAmount: "90.00",
  description: "Maxima, savaitės pirkiniai",
  sharedExpense: marker,
};

export const outdatedSharedPurchase: TransactionResponse = {
  ...sharedPurchase,
  amount: "96.40",
  reportingAmount: "96.40",
  sharedExpense: { ...marker, amountDiffers: true },
};

export const alreadySplitProblem = problemOf(
  409,
  "settleUp.alreadySplit",
  "This expense is already split.",
  {
    instance: `/api/households/${ids.households.family}/shared-expenses`,
  },
);

export const settlementAccountOwnerProblem = problemOf(
  400,
  "settleUp.accountOwner",
  "The money must leave an account of the payer and arrive in an account of the payee.",
  { instance: `/api/households/${ids.households.family}/settlements` },
);
