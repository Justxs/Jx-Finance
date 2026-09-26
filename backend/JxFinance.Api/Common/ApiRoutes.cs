namespace JxFinance.Common;

public static class ApiRoutes
{
    public const string Prefix = "api";
    public const string Base = "/" + Prefix;

    public const string Accounts = "accounts";
    public const string AccountsPath = Base + "/" + Accounts;

    public const string Assets = "assets";
    public const string AssetsPath = Base + "/" + Assets;

    public const string Attachments = "attachments";
    public const string AttachmentsPath = Base + "/" + Attachments;

    public const string Auth = "auth";
    public const string AuthPath = Base + "/" + Auth;

    public const string Backups = "backups";
    public const string BackupsPath = Base + "/" + Backups;

    public const string Budgets = "budgets";
    public const string BudgetsPath = Base + "/" + Budgets;

    public const string Categories = "categories";
    public const string CategoriesPath = Base + "/" + Categories;

    public const string CategorizationRules = "categorization-rules";
    public const string CategorizationRulesPath = Base + "/" + CategorizationRules;

    public const string Conversions = "conversions";
    public const string ConversionsPath = Base + "/" + Conversions;

    public const string Currencies = "currencies";

    public const string Dashboard = "dashboard";

    public const string Debts = "debts";
    public const string DebtsPath = Base + "/" + Debts;

    public const string ExchangeRates = "exchange-rates";

    public const string Goals = "goals";
    public const string GoalsPath = Base + "/" + Goals;

    public const string Households = "households";
    public const string HouseholdsPath = Base + "/" + Households;

    public const string Import = "import";
    public const string ImportPath = Base + "/" + Import;

    public const string Investments = "investments";
    public const string InvestmentsPath = Base + "/" + Investments;

    public const string NetWorth = "networth";
    public const string NetWorthPath = Base + "/" + NetWorth;

    public const string Notifications = "notifications";

    public const string Ping = "ping";

    public const string RecurringBills = "recurring-bills";
    public const string RecurringBillsPath = Base + "/" + RecurringBills;

    public const string Reports = "reports";
    public const string ReportsPath = Base + "/" + Reports;

    public const string Settings = "settings";

    public const string Setup = "setup";

    public const string Tags = "tags";
    public const string TagsPath = Base + "/" + Tags;

    public const string Transactions = "transactions";
    public const string TransactionsPath = Base + "/" + Transactions;

    public const string Transfers = "transfers";
    public const string TransfersPath = Base + "/" + Transfers;

    public const string Trash = "trash";

    public const string Users = "users";
    public const string UsersPath = Base + "/" + Users;
}
