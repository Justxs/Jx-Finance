import type {
  AccountResponse,
  AssetResponse,
  BudgetResponse,
  CategoryBreakdownItem,
  CategoryBreakdownResponse,
  CategoryResponse,
  ConfirmRecurringBillResponse,
  DashboardSummaryResponse,
  DebtResponse,
  EnableTwoFactorResponse,
  GetPingResponse,
  GoalResponse,
  HouseholdMemberResponse,
  HouseholdResponse,
  ImportConfirmResponse,
  ImportPreviewResponse,
  ImportPreviewRow,
  LoginResponse,
  MonthlyTrendItem,
  MonthlyTrendResponse,
  NetWorthHistoryResponse,
  NetWorthResponse,
  NetWorthSnapshotItem,
  NotificationResponse,
  PagedResponseOfTransactionResponse,
  PagedResponseOfTransferResponse,
  ProblemDetails,
  RecurringBillResponse,
  ReportSummaryResponse,
  ReportTrendPoint,
  SetupStatusResponse,
  TransactionLineResponse,
  TransactionResponse,
  TransferResponse,
  TwoFactorSetupResponse,
  UserProfileResponse,
} from "@/api/generated/model";

export const FIXTURE_TODAY = "2026-09-18";
export const FIXTURE_MONTH = "2026-09";
export const FIXTURE_MONTH_START = "2026-09-01";
export const FIXTURE_MONTH_END = "2026-09-30";
export const FIXTURE_YEAR_START = "2025-10-01";

function uid(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const ids = {
  users: {
    ruta: uid("11111111", 1),
    sarunas: uid("11111111", 2),
    zygimantas: uid("11111111", 3),
    egle: uid("11111111", 4),
  },
  households: {
    family: uid("22222222", 1),
    garden: uid("22222222", 2),
  },
  accounts: {
    checking: uid("33333333", 1),
    savings: uid("33333333", 2),
    cash: uid("33333333", 3),
    shared: uid("33333333", 4),
  },
  categories: {
    salary: uid("44444444", 1),
    sideIncome: uid("44444444", 2),
    gifts: uid("44444444", 3),
    food: uid("44444444", 4),
    transport: uid("44444444", 5),
    utilities: uid("44444444", 6),
    telecom: uid("44444444", 7),
    housing: uid("44444444", 8),
    entertainment: uid("44444444", 9),
    health: uid("44444444", 10),
    cafes: uid("44444444", 11),
    shopping: uid("44444444", 12),
    householdGoods: uid("44444444", 13),
    noIcon: uid("44444444", 14),
  },
  transactions: {
    maxima: uid("55555555", 1),
    split: uid("55555555", 6),
    salary: uid("55555555", 9),
    longDescription: uid("55555555", 16),
    uncategorised: uid("55555555", 21),
  },
  transfers: {
    toSavings: uid("66666666", 1),
    toShared: uid("66666666", 2),
    cashWithdrawal: uid("66666666", 3),
  },
  budgets: {
    food: uid("77777777", 1),
    transport: uid("77777777", 2),
    entertainment: uid("77777777", 3),
    utilities: uid("77777777", 4),
  },
  goals: {
    vacation: uid("88888888", 1),
    emergencyFund: uid("88888888", 2),
    bicycle: uid("88888888", 3),
  },
  bills: {
    telia: uid("99999999", 1),
    ignitis: uid("99999999", 2),
    mortgage: uid("99999999", 3),
    insurance: uid("99999999", 4),
    netflix: uid("99999999", 5),
    water: uid("99999999", 6),
  },
  notifications: {
    telia: uid("aaaaaaaa", 1),
    water: uid("aaaaaaaa", 2),
    ignitis: uid("aaaaaaaa", 3),
    mortgage: uid("aaaaaaaa", 4),
  },
  assets: {
    apartment: uid("bbbbbbbb", 1),
    car: uid("bbbbbbbb", 2),
    investments: uid("bbbbbbbb", 3),
  },
  debts: {
    mortgage: uid("cccccccc", 1),
    carLease: uid("cccccccc", 2),
  },
} as const;

export const currentUser: UserProfileResponse = {
  id: ids.users.ruta,
  email: "ruta.kazlauskiene@example.lt",
  displayName: "Rūta Kazlauskienė",
  role: "Admin",
  twoFactorEnabled: false,
  isActive: true,
};

export const currentUserWithTwoFactor: UserProfileResponse = {
  ...currentUser,
  twoFactorEnabled: true,
};

export const memberUser: UserProfileResponse = {
  id: ids.users.sarunas,
  email: "sarunas.kazlauskas@example.lt",
  displayName: "Šarūnas Kazlauskas",
  role: "Member",
  twoFactorEnabled: true,
  isActive: true,
};

export const longNameUser: UserProfileResponse = {
  id: ids.users.zygimantas,
  email: "zygimantas.ciurlionis-zemaitaitis.labai.ilgas.adresas@pavyzdine-imone.example.lt",
  displayName: "Žygimantas Augustinas Čiurlionis-Žemaitaitis",
  role: "Member",
  twoFactorEnabled: false,
  isActive: true,
};

export const inactiveUser: UserProfileResponse = {
  id: ids.users.egle,
  email: "egle.butkute@example.lt",
  displayName: "Eglė Butkutė",
  role: "Member",
  twoFactorEnabled: false,
  isActive: false,
};

export const users: UserProfileResponse[] = [currentUser, memberUser, longNameUser, inactiveUser];

export const householdMembers: HouseholdMemberResponse[] = [
  {
    userId: ids.users.ruta,
    email: currentUser.email,
    displayName: currentUser.displayName,
    role: "owner",
  },
  {
    userId: ids.users.sarunas,
    email: memberUser.email,
    displayName: memberUser.displayName,
    role: "member",
  },
];

export const familyHousehold: HouseholdResponse = {
  id: ids.households.family,
  name: "Kazlauskų šeima",
  myRole: "owner",
  members: householdMembers,
};

export const gardenHousehold: HouseholdResponse = {
  id: ids.households.garden,
  name: "Sodininkų bendrija „Ąžuolynas“ – bendros išlaidos, kelio remontas ir vandentiekio fondas",
  myRole: "member",
  members: [
    {
      userId: ids.users.zygimantas,
      email: longNameUser.email,
      displayName: longNameUser.displayName,
      role: "owner",
    },
    {
      userId: ids.users.ruta,
      email: currentUser.email,
      displayName: currentUser.displayName,
      role: "member",
    },
    {
      userId: ids.users.sarunas,
      email: memberUser.email,
      displayName: memberUser.displayName,
      role: "member",
    },
  ],
};

export const households: HouseholdResponse[] = [familyHousehold, gardenHousehold];

export const checkingAccount: AccountResponse = {
  id: ids.accounts.checking,
  name: "Swedbank einamoji",
  description: "Pagrindinė atlyginimo sąskaita",
  iban: "LT127300010123456789",
  type: "checking",
  startingBalance: "1250.00",
  currentBalance: "2843.17",
  createdAt: "2025-01-04T09:15:00Z",
  scope: "personal",
  householdId: null,
};

export const savingsAccount: AccountResponse = {
  id: ids.accounts.savings,
  name: "Taupomoji sąskaita",
  description: null,
  iban: "LT647044001231465456",
  type: "savings",
  startingBalance: "8000.00",
  currentBalance: "12500.00",
  createdAt: "2025-01-04T09:20:00Z",
  scope: "personal",
  householdId: null,
};

export const cashAccount: AccountResponse = {
  id: ids.accounts.cash,
  name: "Grynieji",
  description: "Piniginė ir namų stalčius",
  iban: null,
  type: "cash",
  startingBalance: "100.00",
  currentBalance: "185.50",
  createdAt: "2025-02-11T17:42:00Z",
  scope: "personal",
  householdId: null,
};

export const sharedAccount: AccountResponse = {
  id: ids.accounts.shared,
  name: "Bendra šeimos sąskaita kasdienėms išlaidoms ir komunaliniams mokesčiams",
  description:
    "Į šią sąskaitą abu kas mėnesį pervedame po lygiai; iš jos mokame už maistą, komunalines paslaugas, būsto paskolą ir visus kitus bendrus namų ūkio pirkinius.",
  iban: "LT601010012345678901",
  type: "checking",
  startingBalance: "500.00",
  currentBalance: "1620.40",
  createdAt: "2025-03-01T08:00:00Z",
  scope: "shared",
  householdId: ids.households.family,
};

export const accounts: AccountResponse[] = [
  checkingAccount,
  savingsAccount,
  cashAccount,
  sharedAccount,
];

function category(
  id: string,
  name: string,
  type: CategoryResponse["type"],
  icon: string | null,
  isDefault: boolean,
  householdId: string | null = null,
): CategoryResponse {
  return {
    id,
    name,
    type,
    icon,
    isDefault,
    scope: householdId ? "shared" : "personal",
    householdId,
  };
}

export const categories: CategoryResponse[] = [
  category(ids.categories.salary, "Atlyginimas", "income", "briefcase", true),
  category(ids.categories.sideIncome, "Papildomos pajamos", "income", "coins", false),
  category(ids.categories.gifts, "Dovanos", "income", "gift", true),
  category(ids.categories.food, "Maistas", "expense", "utensils", true),
  category(ids.categories.transport, "Transportas", "expense", "bus", true),
  category(ids.categories.utilities, "Komunaliniai mokesčiai", "expense", "lightbulb", true),
  category(ids.categories.telecom, "Ryšiai ir internetas", "expense", "wifi", false),
  category(ids.categories.housing, "Būstas", "expense", "home", true),
  category(ids.categories.entertainment, "Pramogos", "expense", "clapperboard", false),
  category(ids.categories.health, "Sveikata", "expense", "heart-pulse", true),
  category(ids.categories.cafes, "Kavinės ir restoranai", "expense", "coffee", false),
  category(ids.categories.shopping, "Apsipirkimas", "expense", "shopping-bag", false),
  category(
    ids.categories.householdGoods,
    "Namų ūkio prekės, remontas ir sodo priežiūra (bendra)",
    "expense",
    "shapes",
    false,
    ids.households.family,
  ),
  category(ids.categories.noIcon, "Kita", "expense", null, false),
];

export const incomeCategories: CategoryResponse[] = categories.filter(
  (item) => item.type === "income",
);

export const expenseCategories: CategoryResponse[] = categories.filter(
  (item) => item.type === "expense",
);

function transaction(
  n: number,
  date: string,
  accountId: string,
  categoryId: string | null,
  type: TransactionResponse["type"],
  amount: string,
  description: string | null,
  source: TransactionResponse["source"],
): TransactionResponse {
  return {
    id: uid("55555555", n),
    accountId,
    categoryId,
    type,
    amount,
    date,
    description,
    source,
    isSplit: false,
    createdAt: `${date}T${String(8 + (n % 12)).padStart(2, "0")}:30:00Z`,
    lines: null,
  };
}

export const splitTransactionLines: TransactionLineResponse[] = [
  {
    id: uid("55555556", 1),
    categoryId: ids.categories.food,
    amount: "74.15",
    description: "Savaitės maisto produktai",
  },
  {
    id: uid("55555556", 2),
    categoryId: ids.categories.householdGoods,
    amount: "39.26",
    description: "Skalbimo priemonės ir lemputės",
  },
  {
    id: uid("55555556", 3),
    categoryId: null,
    amount: "14.99",
    description: null,
  },
];

export const splitTransaction: TransactionResponse = {
  ...transaction(
    6,
    "2026-09-13",
    ids.accounts.shared,
    null,
    "expense",
    "128.40",
    "Maxima XXX Akropolis – didysis savaitgalio apsipirkimas",
    "manual",
  ),
  isSplit: true,
  lines: splitTransactionLines,
};

export const longDescriptionTransaction: TransactionResponse = transaction(
  16,
  "2026-09-05",
  ids.accounts.checking,
  ids.categories.shopping,
  "expense",
  "249.00",
  "Senukai, Ukmergės g. 369, Vilnius – sodo baldų komplektas su pagalvėlėmis, pristatymas į namus, surinkimo paslauga ir pratęsta dvejų metų garantija (užsakymo Nr. LT-2026-0905-778812)",
  "imported",
);

export const uncategorisedTransaction: TransactionResponse = transaction(
  21,
  "2026-09-01",
  ids.accounts.cash,
  null,
  "expense",
  "50.00",
  null,
  "manual",
);

export const transactions: TransactionResponse[] = [
  transaction(
    1,
    "2026-09-17",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "42.18",
    "Maxima X, Ukmergės g.",
    "imported",
  ),
  transaction(
    2,
    "2026-09-16",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "7.40",
    "Bolt pavėžėjimas",
    "imported",
  ),
  transaction(
    3,
    "2026-09-15",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "68.93",
    "Ignitis – elektra už rugpjūtį",
    "imported",
  ),
  transaction(
    4,
    "2026-09-15",
    ids.accounts.checking,
    ids.categories.telecom,
    "expense",
    "24.99",
    "Telia – mobilusis ryšys ir internetas",
    "imported",
  ),
  transaction(
    5,
    "2026-09-14",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "56.72",
    "Lidl Žirmūnai",
    "imported",
  ),
  splitTransaction,
  transaction(
    7,
    "2026-09-12",
    ids.accounts.cash,
    ids.categories.cafes,
    "expense",
    "4.80",
    "Caffeine – kava išsinešti",
    "manual",
  ),
  transaction(
    8,
    "2026-09-11",
    ids.accounts.checking,
    ids.categories.entertainment,
    "expense",
    "18.00",
    "Forum Cinemas Vingis",
    "imported",
  ),
  transaction(
    9,
    "2026-09-10",
    ids.accounts.checking,
    ids.categories.salary,
    "income",
    "2850.00",
    "UAB „Baltijos sprendimai“ – darbo užmokestis",
    "imported",
  ),
  transaction(
    10,
    "2026-09-10",
    ids.accounts.shared,
    ids.categories.salary,
    "income",
    "2140.00",
    "Šarūno atlyginimas",
    "manual",
  ),
  transaction(
    11,
    "2026-09-09",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "61.35",
    "Circle K – degalai",
    "imported",
  ),
  transaction(
    12,
    "2026-09-08",
    ids.accounts.checking,
    ids.categories.health,
    "expense",
    "23.47",
    "Eurovaistinė",
    "imported",
  ),
  transaction(
    13,
    "2026-09-07",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "31.06",
    "Rimi Hyper",
    "imported",
  ),
  transaction(
    14,
    "2026-09-06",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "19.84",
    "Vilniaus vandenys",
    "imported",
  ),
  transaction(
    15,
    "2026-09-05",
    ids.accounts.shared,
    ids.categories.housing,
    "expense",
    "612.00",
    "Būsto paskolos įmoka",
    "imported",
  ),
  longDescriptionTransaction,
  transaction(
    17,
    "2026-09-04",
    ids.accounts.checking,
    ids.categories.cafes,
    "expense",
    "16.90",
    "Wolt – Jurgis ir Drakonas",
    "imported",
  ),
  transaction(
    18,
    "2026-09-03",
    ids.accounts.checking,
    ids.categories.sideIncome,
    "income",
    "420.00",
    "Vertimų projektas – sąskaita RK-0027",
    "manual",
  ),
  transaction(
    19,
    "2026-09-02",
    ids.accounts.shared,
    ids.categories.utilities,
    "expense",
    "12.38",
    "Vilniaus šilumos tinklai",
    "imported",
  ),
  transaction(
    20,
    "2026-09-01",
    ids.accounts.checking,
    ids.categories.entertainment,
    "expense",
    "10.99",
    "Spotify Premium",
    "imported",
  ),
  uncategorisedTransaction,
  transaction(
    22,
    "2026-08-30",
    ids.accounts.shared,
    ids.categories.food,
    "expense",
    "27.63",
    "IKI Antakalnis",
    "imported",
  ),
  transaction(
    23,
    "2026-08-28",
    ids.accounts.cash,
    ids.categories.gifts,
    "income",
    "100.00",
    "Gimtadienio dovana nuo močiutės",
    "manual",
  ),
  transaction(
    24,
    "2026-08-25",
    ids.accounts.checking,
    ids.categories.shopping,
    "expense",
    "89.95",
    "Zara, Akropolis",
    "imported",
  ),
  transaction(
    25,
    "2026-08-20",
    ids.accounts.checking,
    ids.categories.transport,
    "expense",
    "29.00",
    "Trafi – mėnesinis viešojo transporto bilietas",
    "manual",
  ),
  transaction(
    26,
    "2026-08-10",
    ids.accounts.checking,
    ids.categories.salary,
    "income",
    "2850.00",
    "UAB „Baltijos sprendimai“ – darbo užmokestis",
    "imported",
  ),
];

export const transactionsPage: PagedResponseOfTransactionResponse = {
  items: transactions.slice(0, 20),
  page: 1,
  pageSize: 20,
  total: transactions.length,
};

export const emptyTransactionsPage: PagedResponseOfTransactionResponse = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
};

export const transfers: TransferResponse[] = [
  {
    id: ids.transfers.toSavings,
    fromAccountId: ids.accounts.checking,
    toAccountId: ids.accounts.savings,
    amount: "400.00",
    date: "2026-09-11",
    description: "Mėnesio taupymas",
    createdAt: "2026-09-11T07:05:00Z",
  },
  {
    id: ids.transfers.toShared,
    fromAccountId: ids.accounts.checking,
    toAccountId: ids.accounts.shared,
    amount: "900.00",
    date: "2026-09-10",
    description:
      "Rugsėjo įnašas į bendrą šeimos sąskaitą (maistas, komunaliniai, paskola, vaikų būreliai)",
    createdAt: "2026-09-10T18:22:00Z",
  },
  {
    id: ids.transfers.cashWithdrawal,
    fromAccountId: ids.accounts.checking,
    toAccountId: ids.accounts.cash,
    amount: "100.00",
    date: "2026-08-29",
    description: null,
    createdAt: "2026-08-29T12:40:00Z",
  },
];

export const transfersPage: PagedResponseOfTransferResponse = {
  items: transfers,
  page: 1,
  pageSize: 20,
  total: transfers.length,
};

export const emptyTransfersPage: PagedResponseOfTransferResponse = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
};

interface CategorisedAmount {
  categoryId: string | null;
  cents: number;
}

function expenseParts(items: TransactionResponse[]): CategorisedAmount[] {
  return items
    .filter((item) => item.type === "expense")
    .flatMap((item) =>
      item.isSplit && item.lines
        ? item.lines.map((line) => ({
            categoryId: line.categoryId,
            cents: toCents(line.amount),
          }))
        : [{ categoryId: item.categoryId, cents: toCents(item.amount) }],
    );
}

function sumByType(items: TransactionResponse[], type: TransactionResponse["type"]): number {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + toCents(item.amount), 0);
}

export function transactionsBetween(dateFrom: string, dateTo: string): TransactionResponse[] {
  return transactions.filter((item) => item.date >= dateFrom && item.date <= dateTo);
}

export function buildCategoryBreakdownItems(items: TransactionResponse[]): CategoryBreakdownItem[] {
  const totals = new Map<string | null, number>();
  for (const part of expenseParts(items)) {
    totals.set(part.categoryId, (totals.get(part.categoryId) ?? 0) + part.cents);
  }
  return [...totals.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([categoryId, cents]) => {
      const match = categories.find((item) => item.id === categoryId);
      return {
        categoryId,
        categoryName: match?.name ?? "Uncategorized",
        categoryIcon: match?.icon ?? null,
        amount: fromCents(cents),
      };
    });
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildDailyTrend(dateFrom: string, dateTo: string): ReportTrendPoint[] {
  const points: ReportTrendPoint[] = [];
  for (let day = dateFrom; day <= dateTo && points.length < 366; day = addDays(day, 1)) {
    const items = transactions.filter((item) => item.date === day);
    points.push({
      bucketStart: day,
      income: fromCents(sumByType(items, "income")),
      expense: fromCents(sumByType(items, "expense")),
    });
  }
  return points;
}

export function buildReportSummary(dateFrom: string, dateTo: string): ReportSummaryResponse {
  const items = transactionsBetween(dateFrom, dateTo);
  const income = sumByType(items, "income");
  const expense = sumByType(items, "expense");
  return {
    periodStart: dateFrom,
    periodEnd: dateTo,
    totalIncome: fromCents(income),
    totalExpense: fromCents(expense),
    net: fromCents(income - expense),
    expenseByCategory: buildCategoryBreakdownItems(items),
    trend: buildDailyTrend(dateFrom, dateTo),
    trendBucket: "day",
  };
}

const monthTransactions = transactionsBetween(FIXTURE_MONTH_START, FIXTURE_MONTH_END);
const monthIncomeCents = sumByType(monthTransactions, "income");
const monthExpenseCents = sumByType(monthTransactions, "expense");

function spentInMonth(categoryId: string): number {
  return expenseParts(monthTransactions)
    .filter((part) => part.categoryId === categoryId)
    .reduce((total, part) => total + part.cents, 0);
}

function budget(id: string, categoryId: string, limitAmount: string): BudgetResponse {
  const spent = spentInMonth(categoryId);
  return {
    id,
    categoryId,
    categoryName: categories.find((item) => item.id === categoryId)?.name ?? "",
    limitAmount,
    spent: fromCents(spent),
    remaining: fromCents(toCents(limitAmount) - spent),
    period: "Monthly",
  };
}

export const overLimitBudget: BudgetResponse = budget(
  ids.budgets.food,
  ids.categories.food,
  "150.00",
);

export const budgets: BudgetResponse[] = [
  overLimitBudget,
  budget(ids.budgets.transport, ids.categories.transport, "120.00"),
  budget(ids.budgets.entertainment, ids.categories.entertainment, "60.00"),
  budget(ids.budgets.utilities, ids.categories.utilities, "150.00"),
];

export const goalWithTargetDate: GoalResponse = {
  id: ids.goals.vacation,
  name: "Atostogos Madeiroje visai šeimai",
  targetAmount: "3200.00",
  currentAmount: "1875.50",
  targetDate: "2027-06-15",
};

export const openEndedGoal: GoalResponse = {
  id: ids.goals.emergencyFund,
  name: "Nenumatytų išlaidų fondas – šešių mėnesių pragyvenimo išlaidų rezervas šeimai",
  targetAmount: "15000.00",
  currentAmount: "12500.00",
  targetDate: null,
};

export const completedGoal: GoalResponse = {
  id: ids.goals.bicycle,
  name: "Naujas dviratis",
  targetAmount: "900.00",
  currentAmount: "900.00",
  targetDate: "2026-08-01",
};

export const goals: GoalResponse[] = [goalWithTargetDate, openEndedGoal, completedGoal];

export const dueSoonBill: RecurringBillResponse = {
  id: ids.bills.telia,
  name: "Telia – mobilusis ryšys ir internetas",
  kind: "fixed",
  amount: "24.99",
  categoryId: ids.categories.telecom,
  accountId: ids.accounts.checking,
  cadence: "monthly",
  nextDueDate: "2026-09-20",
  remindDaysBefore: 3,
  isActive: true,
};

export const variableBill: RecurringBillResponse = {
  id: ids.bills.ignitis,
  name: "Ignitis – elektra",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  cadence: "monthly",
  nextDueDate: "2026-09-25",
  remindDaysBefore: 5,
  isActive: true,
};

export const overdueBill: RecurringBillResponse = {
  id: ids.bills.water,
  name: "Vilniaus vandenys",
  kind: "variable",
  amount: null,
  categoryId: ids.categories.utilities,
  accountId: ids.accounts.shared,
  cadence: "monthly",
  nextDueDate: "2026-09-16",
  remindDaysBefore: 2,
  isActive: true,
};

export const inactiveBill: RecurringBillResponse = {
  id: ids.bills.netflix,
  name: "Netflix",
  kind: "fixed",
  amount: "13.99",
  categoryId: ids.categories.entertainment,
  accountId: ids.accounts.checking,
  cadence: "monthly",
  nextDueDate: "2026-07-01",
  remindDaysBefore: 0,
  isActive: false,
};

export const recurringBills: RecurringBillResponse[] = [
  overdueBill,
  dueSoonBill,
  variableBill,
  {
    id: ids.bills.mortgage,
    name: "Būsto paskolos įmoka",
    kind: "fixed",
    amount: "612.00",
    categoryId: ids.categories.housing,
    accountId: ids.accounts.shared,
    cadence: "monthly",
    nextDueDate: "2026-10-05",
    remindDaysBefore: 3,
    isActive: true,
  },
  {
    id: ids.bills.insurance,
    name: "Privalomasis ir KASKO automobilio draudimas (Lietuvos draudimas), metinė įmoka",
    kind: "fixed",
    amount: "286.40",
    categoryId: ids.categories.transport,
    accountId: null,
    cadence: "yearly",
    nextDueDate: "2027-03-14",
    remindDaysBefore: 14,
    isActive: true,
  },
  inactiveBill,
];

export const confirmRecurringBillResult: ConfirmRecurringBillResponse = {
  bill: { ...dueSoonBill, nextDueDate: "2026-10-20" },
  transactionId: uid("55555555", 101),
};

function billNotification(
  id: string,
  bill: RecurringBillResponse,
  isRead: boolean,
  channel: NotificationResponse["channel"],
  createdAt: string,
): NotificationResponse {
  return {
    id,
    type: "billDue",
    title: bill.name,
    message: bill.nextDueDate,
    relatedType: "RecurringBill",
    relatedId: bill.id,
    channel,
    isRead,
    createdAt,
  };
}

export const notifications: NotificationResponse[] = [
  billNotification(ids.notifications.telia, dueSoonBill, false, "inApp", "2026-09-17T06:00:00Z"),
  billNotification(ids.notifications.water, overdueBill, false, "inApp", "2026-09-14T06:00:00Z"),
  billNotification(ids.notifications.ignitis, variableBill, true, "email", "2026-08-20T06:00:00Z"),
  {
    id: ids.notifications.mortgage,
    type: "billDue",
    title: "Būsto paskolos įmoka",
    message: "2026-09-05",
    relatedType: "RecurringBill",
    relatedId: ids.bills.mortgage,
    channel: "inApp",
    isRead: true,
    createdAt: "2026-09-02T06:00:00Z",
  },
];

export const unreadNotifications: NotificationResponse[] = notifications.filter(
  (item) => !item.isRead,
);

export const assets: AssetResponse[] = [
  {
    id: ids.assets.apartment,
    name: "Butas Žirmūnuose, 3 kambariai, 68 m²",
    type: "property",
    currentValue: "145000.00",
    asOf: "2026-06-30",
  },
  {
    id: ids.assets.car,
    name: "Toyota Corolla 2021",
    type: "vehicle",
    currentValue: "14500.00",
    asOf: "2026-08-15",
  },
  {
    id: ids.assets.investments,
    name: "III pakopos pensijų fondas ir ETF portfelis",
    type: "investment",
    currentValue: "8320.55",
    asOf: "2026-09-01",
  },
];

export const debts: DebtResponse[] = [
  {
    id: ids.debts.mortgage,
    name: "Būsto paskola (Swedbank)",
    type: "mortgage",
    outstandingAmount: "98450.32",
    interestRate: 3.85,
    asOf: "2026-09-05",
  },
  {
    id: ids.debts.carLease,
    name: "Automobilio lizingas",
    type: "loan",
    outstandingAmount: "6200.00",
    interestRate: null,
    asOf: "2026-09-01",
  },
];

function totalOf(amounts: string[]): number {
  return amounts.reduce((total, amount) => total + toCents(amount), 0);
}

const accountsCents = totalOf(accounts.map((item) => item.currentBalance));
const assetsCents = totalOf(assets.map((item) => item.currentValue));
const debtsCents = totalOf(debts.map((item) => item.outstandingAmount));

export const netWorth: NetWorthResponse = {
  accounts: fromCents(accountsCents),
  assets: fromCents(assetsCents),
  debts: fromCents(debtsCents),
  netWorth: fromCents(accountsCents + assetsCents - debtsCents),
};

export const emptyNetWorth: NetWorthResponse = {
  accounts: "0.00",
  assets: "0.00",
  debts: "0.00",
  netWorth: "0.00",
};

function snapshot(date: string, accountsValue: string, assetsValue: string, debtsValue: string) {
  const item: NetWorthSnapshotItem = {
    date,
    accounts: accountsValue,
    assets: assetsValue,
    debts: debtsValue,
    netWorth: fromCents(toCents(accountsValue) + toCents(assetsValue) - toCents(debtsValue)),
  };
  return item;
}

export const netWorthHistoryItems: NetWorthSnapshotItem[] = [
  snapshot("2025-10-01", "11240.10", "161200.00", "109980.75"),
  snapshot("2025-11-01", "11875.42", "161450.30", "109512.10"),
  snapshot("2025-12-01", "12390.05", "161900.80", "109040.66"),
  snapshot("2026-01-01", "11020.77", "162300.00", "108566.40"),
  snapshot("2026-02-01", "12110.30", "162950.45", "108089.31"),
  snapshot("2026-03-01", "13004.88", "163400.10", "107609.35"),
  snapshot("2026-04-01", "13790.15", "164800.00", "107126.52"),
  snapshot("2026-05-01", "14615.60", "165320.75", "106640.79"),
  snapshot("2026-06-01", "15230.94", "165900.20", "106152.13"),
  snapshot("2026-07-01", "14870.12", "167100.00", "105660.52"),
  snapshot("2026-08-01", "16045.33", "167480.90", "105165.94"),
  snapshot("2026-09-01", netWorth.accounts, netWorth.assets, netWorth.debts),
];

export const netWorthHistory: NetWorthHistoryResponse = { items: netWorthHistoryItems };

export const dashboardSummary: DashboardSummaryResponse = {
  totalBalance: netWorth.accounts,
  monthIncome: fromCents(monthIncomeCents),
  monthExpense: fromCents(monthExpenseCents),
  monthStart: FIXTURE_MONTH_START,
  monthEnd: FIXTURE_MONTH_END,
};

export const emptyDashboardSummary: DashboardSummaryResponse = {
  totalBalance: "0.00",
  monthIncome: "0.00",
  monthExpense: "0.00",
  monthStart: FIXTURE_MONTH_START,
  monthEnd: FIXTURE_MONTH_END,
};

export const monthlyTrendItems: MonthlyTrendItem[] = [
  { year: 2026, month: 4, income: "5010.00", expense: "3120.45" },
  { year: 2026, month: 5, income: "4990.00", expense: "2876.10" },
  { year: 2026, month: 6, income: "6240.00", expense: "3954.72" },
  { year: 2026, month: 7, income: "4990.00", expense: "4410.38" },
  { year: 2026, month: 8, income: "5090.00", expense: "3287.91" },
  {
    year: 2026,
    month: 9,
    income: fromCents(monthIncomeCents),
    expense: fromCents(monthExpenseCents),
  },
];

export const monthlyTrend: MonthlyTrendResponse = { items: monthlyTrendItems };

export const categoryBreakdownItems: CategoryBreakdownItem[] =
  buildCategoryBreakdownItems(monthTransactions);

export const categoryBreakdown: CategoryBreakdownResponse = {
  items: categoryBreakdownItems,
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
};

export const emptyCategoryBreakdown: CategoryBreakdownResponse = {
  items: [],
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
};

export const reportSummaryMonth: ReportSummaryResponse = buildReportSummary(
  FIXTURE_MONTH_START,
  FIXTURE_MONTH_END,
);

const yearTrend: ReportTrendPoint[] = [
  { bucketStart: "2025-10-01", income: "4990.00", expense: "3011.27" },
  { bucketStart: "2025-11-01", income: "4990.00", expense: "3340.80" },
  { bucketStart: "2025-12-01", income: "6890.00", expense: "5122.64" },
  { bucketStart: "2026-01-01", income: "4990.00", expense: "2790.15" },
  { bucketStart: "2026-02-01", income: "4990.00", expense: "2688.93" },
  { bucketStart: "2026-03-01", income: "5240.00", expense: "3075.50" },
  ...monthlyTrendItems.map((item) => ({
    bucketStart: `${item.year}-${String(item.month).padStart(2, "0")}-01`,
    income: item.income,
    expense: item.expense,
  })),
];

const yearIncomeCents = totalOf(yearTrend.map((item) => item.income));
const yearExpenseCents = totalOf(yearTrend.map((item) => item.expense));

function yearCategoryShare(categoryId: string, share: number): CategoryBreakdownItem {
  const match = categories.find((item) => item.id === categoryId);
  return {
    categoryId,
    categoryName: match?.name ?? "",
    categoryIcon: match?.icon ?? null,
    amount: fromCents(Math.round(yearExpenseCents * share)),
  };
}

export const reportSummaryYear: ReportSummaryResponse = {
  periodStart: FIXTURE_YEAR_START,
  periodEnd: FIXTURE_MONTH_END,
  totalIncome: fromCents(yearIncomeCents),
  totalExpense: fromCents(yearExpenseCents),
  net: fromCents(yearIncomeCents - yearExpenseCents),
  expenseByCategory: [
    yearCategoryShare(ids.categories.housing, 0.31),
    yearCategoryShare(ids.categories.food, 0.24),
    yearCategoryShare(ids.categories.utilities, 0.11),
    yearCategoryShare(ids.categories.transport, 0.1),
    yearCategoryShare(ids.categories.shopping, 0.08),
    yearCategoryShare(ids.categories.householdGoods, 0.05),
    yearCategoryShare(ids.categories.cafes, 0.04),
    yearCategoryShare(ids.categories.entertainment, 0.03),
    yearCategoryShare(ids.categories.health, 0.02),
    yearCategoryShare(ids.categories.telecom, 0.01),
    {
      categoryId: null,
      categoryName: "Uncategorized",
      categoryIcon: null,
      amount: fromCents(Math.round(yearExpenseCents * 0.01)),
    },
  ],
  trend: yearTrend,
  trendBucket: "month",
};

export const emptyReportSummary: ReportSummaryResponse = {
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
  totalIncome: "0.00",
  totalExpense: "0.00",
  net: "0.00",
  expenseByCategory: [],
  trend: [],
  trendBucket: "day",
};

export const importPreviewRows: ImportPreviewRow[] = [
  {
    importRef: "2026091700000012",
    date: "2026-09-17",
    payee: "MAXIMA LT, UAB",
    description: "Pirkinys 17.09.2026 MAXIMA X-123 VILNIUS",
    amount: "42.18",
    type: "expense",
    isDuplicate: true,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091800000003",
    date: "2026-09-18",
    payee: "LIDL LIETUVA UAB",
    description: "Pirkinys 18.09.2026 LIDL ZIRMUNU VILNIUS",
    amount: "38.64",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091800000004",
    date: "2026-09-18",
    payee: "Rūta Kazlauskienė",
    description: "Pervedimas į taupomąją sąskaitą LT647044001231465456",
    amount: "250.00",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: true,
  },
  {
    importRef: "2026091600000021",
    date: "2026-09-16",
    payee: "BOLT OPERATIONS OU",
    description: "Pirkinys 16.09.2026 BOLT.EU/O/2609161842 TALLINN",
    amount: "7.40",
    type: "expense",
    isDuplicate: true,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091500000008",
    date: "2026-09-15",
    payee: "IGNITIS, UAB",
    description:
      "Mokėjimas už elektros energiją pagal sąskaitą Nr. IGN-2026-08-004417, mokėtojo kodas 10457788, laikotarpis 2026-08-01–2026-08-31",
    amount: "68.93",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091500000009",
    date: "2026-09-15",
    payee: null,
    description: null,
    amount: "12.00",
    type: "expense",
    isDuplicate: false,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091200000015",
    date: "2026-09-12",
    payee: "VALSTYBINĖ MOKESČIŲ INSPEKCIJA",
    description: "GPM permokos grąžinimas",
    amount: "134.27",
    type: "income",
    isDuplicate: false,
    looksLikeTransfer: false,
  },
  {
    importRef: "2026091000000002",
    date: "2026-09-10",
    payee: "Šarūnas Kazlauskas",
    description: "Įnašas į bendrą sąskaitą",
    amount: "900.00",
    type: "income",
    isDuplicate: false,
    looksLikeTransfer: true,
  },
];

export const importPreview: ImportPreviewResponse = { rows: importPreviewRows };

export const importConfirmResult: ImportConfirmResponse = {
  imported: 6,
  skippedDuplicates: 2,
};

export const twoFactorSetup: TwoFactorSetupResponse = {
  sharedKey: "jbsw y3dp ehpk 3pxp k5tq mzxw 6ytb onqx",
  authenticatorUri:
    "otpauth://totp/Jx%20Finance:ruta.kazlauskiene%40example.lt?secret=JBSWY3DPEHPK3PXPK5TQMZXW6YTBONQX&issuer=Jx%20Finance&digits=6",
};

export const twoFactorRecoveryCodes: EnableTwoFactorResponse = {
  recoveryCodes: [
    "7KQ2M-X9PLD",
    "B4TNV-R6HWC",
    "ZP83J-5FYGA",
    "M2DXC-Q7LRT",
    "H9WVB-3KNSE",
    "T6RFA-8JCMP",
    "C5GLY-W2ZQH",
    "N8ESK-4VBTD",
    "R3JHP-6MXFN",
    "Y7UCW-9DGKL",
  ],
};

export const loginSuccess: LoginResponse = {
  twoFactorRequired: false,
  profile: currentUser,
};

export const loginTwoFactorRequired: LoginResponse = {
  twoFactorRequired: true,
  profile: null,
};

export const setupStatus: SetupStatusResponse = { needsSetup: false };

export const setupStatusNeeded: SetupStatusResponse = { needsSetup: true };

export const ping: GetPingResponse = {
  message: "pong",
  utcNow: "2026-09-18T07:30:00Z",
};

export const serverErrorProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.6.1",
  title: "Internal Server Error",
  status: 500,
  instance: "/api",
  traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
  detail: "Something went wrong while processing the request.",
};

export const unauthorizedProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7235#section-3.1",
  title: "Unauthorized",
  status: 401,
  instance: "/api/auth/me",
  traceId: "00-7c1d2a9e4f5b4c6d8e9f0a1b2c3d4e5f-1a2b3c4d5e6f7a8b-00",
  detail: "You are not signed in.",
};

export const notFoundProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.4",
  title: "Not Found",
  status: 404,
  detail: "The requested resource does not exist.",
};

export const validationProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  detail: "Amount must be greater than zero.",
  errors: [
    {
      name: "amount",
      reason: "Amount must be greater than zero.",
      code: "amount_not_positive",
      severity: "Error",
    },
  ],
};

export const transactionsCsv = [
  "Date,Account,Category,Type,Amount,Description",
  ...transactions.map((item) =>
    [
      item.date,
      accounts.find((account) => account.id === item.accountId)?.name ?? "",
      categories.find((entry) => entry.id === item.categoryId)?.name ?? "",
      item.type,
      item.amount,
      `"${(item.description ?? "").replaceAll('"', '""')}"`,
    ].join(","),
  ),
].join("\n");
