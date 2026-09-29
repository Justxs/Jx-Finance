using JxFinance.Endpoints.Backups.Services;

namespace JxFinance.Endpoints.Users.Services;

public static class UserExportTables
{
    public const string User = "$1";

    private const string Accounts = "Accounts";
    private const string Transactions = "Transactions";
    private const string TransactionId = "TransactionId";
    private const string AccountId = "AccountId";

    public static IReadOnlyDictionary<string, UserExportRule> Rules { get; } = new Dictionary<string, UserExportRule>(StringComparer.Ordinal)
    {
        [Accounts] = new Owned(),
        ["AccountReconciliations"] = new OnOwnedAccounts(AccountId),
        ["AssetValuations"] = new ChildOf("Assets", "AssetId"),
        ["Assets"] = new Owned(),
        ["BrokerConnections"] = new Owned { Hidden = ["ProtectedToken"] },
        ["Budgets"] = new Owned(),
        ["Categories"] = new Referenced(AlsoOwned: true, [(Transactions, "CategoryId"), ("TransactionLines", "CategoryId")]),
        ["CategorizationRules"] = new Owned(),
        ["CategorizationRuleTags"] = new ChildOf("CategorizationRules", "RuleId"),
        ["CsvImportMappings"] = new Owned(),
        ["CurrencyConversions"] = new OnOwnedAccounts(AccountId),
        ["DebtPayments"] = new Owned(),
        ["Debts"] = new Owned(),
        ["DeletionChanges"] = new ChildOf("DeletionEntries", "DeletionEntryId"),
        ["DeletionEntries"] = new Owned(),
        ["Goals"] = new Owned(),
        ["InvestmentTransactions"] = new OnOwnedAccounts(AccountId),
        ["MonthCloses"] = new Owned(),
        ["NetWorthSnapshots"] = new Owned(),
        ["Notifications"] = new Owned(),
        ["ReceiptItemCategories"] = new Owned(),
        ["ReceiptReadings"] = new Owned(),
        ["RecurringBills"] = new Owned(),
        ["Securities"] = new Referenced(AlsoOwned: false, [("InvestmentTransactions", "SecurityId")]),
        ["SubscriptionDismissals"] = new Owned(),
        ["SuggestedRuleDismissals"] = new Owned(),
        ["Tags"] = new Referenced(AlsoOwned: true, [("TransactionTags", "TagId")]),
        [Transactions] = new OnOwnedAccounts(AccountId),
        ["TransactionAttachments"] = new ChildOf(Transactions, TransactionId),
        ["TransactionLines"] = new ChildOf(Transactions, TransactionId),
        ["TransactionTags"] = new ChildOf(Transactions, TransactionId),
        ["TransferImports"] = new OnOwnedAccounts(AccountId),
        ["Transfers"] = new EitherSideOwned("FromAccountId", "ToAccountId"),
        ["AspNetUsers"] = new UserRow(["Id", "Email", "UserName", "DisplayName", "EmailConfirmed", "EmailNotificationTypes", "DashboardLayout", "Language"]),
        ["AspNetRoles"] = new Excluded("installation roles"),
        ["AspNetRoleClaims"] = new Excluded("installation roles"),
        ["AspNetUserRoles"] = new Excluded("the role an administrator gave"),
        ["AspNetUserClaims"] = new Excluded("sign-in data"),
        ["AspNetUserLogins"] = new Excluded("sign-in data"),
        ["AspNetUserTokens"] = new Excluded("authenticator key and recovery codes"),
        ["AspNetUserPasskeys"] = new Excluded("passkey credentials"),
        ["PersonalApiTokens"] = new Excluded("API token hashes"),
        ["UserSessions"] = new Excluded("sessions"),
        ["DiscordWebhooks"] = new Excluded("the Discord webhook URL is a secret"),
        ["DiscordMessages"] = new Excluded("outbox"),
        ["EmailMessages"] = new Excluded("outbox"),
        ["Households"] = new Excluded("belongs to every member of the household"),
        ["HouseholdMemberships"] = new Excluded("belongs to every member of the household"),
        ["AuditEvents"] = new Excluded("belongs to every member of the household"),
        ["InstanceSettings"] = new Excluded("installation settings"),
        ["ExchangeRates"] = new Excluded("installation-wide market data"),
        ["SecurityPrices"] = new Excluded("installation-wide market data"),
        ["SharedExpenses"] = new Owned(),
        ["SharedExpenseShares"] = new ChildOf("SharedExpenses", "SharedExpenseId"),
        ["Settlements"] = new Owned(),
    };

    public static string? Condition(string table) =>
        Rules[table].Condition(Condition) is { } condition ? $"({condition})" : null;

    private static string Q(string identifier) => BackupDatabase.Quote(identifier);

    private static string OwnedAccounts(Func<string, string?> conditionOf) =>
        $"SELECT {Q("Id")} FROM {Q(Accounts)} WHERE {conditionOf(Accounts)}";

    public abstract record UserExportRule
    {
        public IReadOnlyList<string> Hidden { get; init; } = [];

        public abstract string? Condition(Func<string, string?> conditionOf);

        public virtual bool Exports(string column) => !Hidden.Contains(column, StringComparer.Ordinal);
    }

    public sealed record Owned : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf) => $"{Q("UserId")} = {User}";
    }

    public sealed record OnOwnedAccounts(string Column) : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf) =>
            $"{Q(Column)} IN ({OwnedAccounts(conditionOf)})";
    }

    public sealed record EitherSideOwned(string From, string To) : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf) =>
            $"{Q(From)} IN ({OwnedAccounts(conditionOf)}) OR {Q(To)} IN ({OwnedAccounts(conditionOf)})";
    }

    public sealed record ChildOf(string Parent, string Column) : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf) =>
            $"{Q(Column)} IN (SELECT {Q("Id")} FROM {Q(Parent)} WHERE {conditionOf(Parent)})";
    }

    public sealed record Referenced(bool AlsoOwned, IReadOnlyList<(string Table, string Column)> By) : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf)
        {
            var references = By.Select(r => $"{Q("Id")} IN (SELECT {Q(r.Column)} FROM {Q(r.Table)} WHERE {conditionOf(r.Table)})");
            return string.Join(" OR ", AlsoOwned ? references.Prepend($"{Q("UserId")} = {User}") : references);
        }
    }

    public sealed record UserRow(IReadOnlyList<string> Columns) : UserExportRule
    {
        public override string Condition(Func<string, string?> conditionOf) => $"{Q("Id")} = {User}";

        public override bool Exports(string column) => Columns.Contains(column, StringComparer.Ordinal);
    }

    public sealed record Excluded(string Reason) : UserExportRule
    {
        public override string? Condition(Func<string, string?> conditionOf) => null;
    }
}
