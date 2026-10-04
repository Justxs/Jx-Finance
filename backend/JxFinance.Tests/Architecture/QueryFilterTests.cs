using System.Text.RegularExpressions;
using JxFinance.Domain.Audit;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Contacts;
using JxFinance.Domain.Email;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Domain.Households;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using JxFinance.Tests.Unit;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Tests.Architecture;

public sealed partial class QueryFilterTests
{
    private static readonly Type[] GlobalEntities =
    [
        typeof(ApiIdempotencyKey),
        typeof(AppRole),
        typeof(AppUser),
        typeof(AuditEvent),
        typeof(DiscordMessage),
        typeof(EmailMessage),
        typeof(ExchangeRate),
        typeof(IdentityRoleClaim<Guid>),
        typeof(IdentityUserClaim<Guid>),
        typeof(IdentityUserLogin<Guid>),
        typeof(IdentityUserRole<Guid>),
        typeof(IdentityUserToken<Guid>),
        typeof(InstanceSettings),
        typeof(ManualExchangeRate),
        typeof(PersonalApiToken),
        typeof(Security),
        typeof(SecurityPrice),
        typeof(TelegramMessage),
        typeof(UserSession),
    ];

    private static readonly Type[] ChildEntities =
    [
        typeof(AssetValuation),
        typeof(CategorizationRuleTag),
        typeof(ContactSplitShare),
        typeof(DebtBalanceEntry),
        typeof(DeletionChange),
        typeof(DuplicateDismissal),
        typeof(SharedExpenseShare),
        typeof(TransactionLine),
        typeof(TransactionTag),
        typeof(TransferImport),
    ];

    private static readonly string[] FilterBypassFiles =
    [
        "Common/ExchangeRates/ReportingRevaluation.cs",
        "Common/Sharing/ShareableSet.cs",
        "Endpoints/Accounts/Services/AccountService.cs",
        "Endpoints/Backups/Services/BackupService.cs",
        "Endpoints/Categories/Services/CategoryService.cs",
        "Endpoints/Imports/Services/ImportInboxReceiver.cs",
        "Endpoints/Imports/Services/ImportQueries.cs",
        "Endpoints/Investments/Services/StatementImport.cs",
        "Endpoints/Settings/Services/ExchangeRateEntryService.cs",
        "Endpoints/Settings/Services/SettingsService.cs",
        "Endpoints/Trash/Services/CategoryAndTagRestores.cs",
        "Endpoints/Trash/Services/LedgerRestores.cs",
        "Endpoints/Trash/Services/TrashRestorers.cs",
        "Endpoints/Users/Services/UserExportService.cs",
        "Endpoints/Users/Services/UserJournalSource.cs",
        "Infrastructure/BackgroundJobs/MonthCloseReminderJob.cs",
        "Infrastructure/BackgroundJobs/MonthlyDigestJob.cs",
        "Infrastructure/BackgroundJobs/Retention.cs",
        "Infrastructure/BackgroundJobs/RetentionJob.cs",
        "Infrastructure/BackgroundJobs/UnusualAmountJob.cs",
        "Infrastructure/BackgroundJobs/WarrantyReminderJob.cs",
        "Infrastructure/Data/Auditing/AuditCollector.cs",
        "Infrastructure/Data/DemoDataCommand.cs",
        "Infrastructure/Data/DevDataSeeder.cs",
        "Infrastructure/Data/StarterCategories.cs",
    ];

    [Fact]
    public async Task Every_entity_has_an_owner_filter_or_is_approved_as_global_or_child()
    {
        await using var capture = new SqlCapture();

        var unowned = capture.Db.Model.GetEntityTypes()
            .Where(entity => !entity.IsOwned() && entity.BaseType is null)
            .Where(entity => entity.FindDeclaredQueryFilter(QueryFilters.Owner) is null)
            .Select(entity => entity.ClrType.FullName!)
            .Order(StringComparer.Ordinal)
            .ToList();

        ApprovedList.AssertMatches(
            GlobalEntities.Concat(ChildEntities).Select(type => type.FullName!).Order(StringComparer.Ordinal),
            unowned,
            "GlobalEntities and ChildEntities in Architecture/QueryFilterTests.cs",
            entity => $"{entity} has no QueryFilters.Owner filter and is in neither GlobalEntities nor ChildEntities in Architecture/QueryFilterTests.cs. Give it an owner filter in its entity configuration, or add it to GlobalEntities if every user may read every row, or to ChildEntities if it is read only through a filtered parent.",
            entity => $"{entity} is in GlobalEntities or ChildEntities in Architecture/QueryFilterTests.cs but has an owner filter now or is no longer mapped. Remove it from the list.");
    }

    [Fact]
    public void Only_approved_files_switch_off_every_query_filter()
    {
        var apiDirectory = RepoPath.Of("JxFinance.Api");
        var bypassing = Directory
            .EnumerateFiles(apiDirectory, "*.cs", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(apiDirectory, file).Replace(Path.DirectorySeparatorChar, '/'))
            .Where(file => !file.StartsWith("bin/", StringComparison.Ordinal) && !file.StartsWith("obj/", StringComparison.Ordinal))
            .Where(file => IgnoresEveryFilter().IsMatch(File.ReadAllText(Path.Combine(apiDirectory, file))))
            .Order(StringComparer.Ordinal)
            .ToList();

        ApprovedList.AssertMatches(
            FilterBypassFiles.Order(StringComparer.Ordinal),
            bypassing,
            "FilterBypassFiles in Architecture/QueryFilterTests.cs",
            file => $"{file} calls a bare IgnoreQueryFilters(), which shows deleted rows and every user's rows, and is not in FilterBypassFiles in Architecture/QueryFilterTests.cs. Drop only the filter it needs with IgnoreQueryFilters(QueryFilters.OwnerOnly) or IgnoreQueryFilters(QueryFilters.SoftDeleteOnly), or add the file if it must read every row and constrains the query itself.",
            file => $"{file} is in FilterBypassFiles in Architecture/QueryFilterTests.cs but no longer calls a bare IgnoreQueryFilters() or was moved. Remove it from the list, or update the path.");
    }

    [GeneratedRegex(@"\.IgnoreQueryFilters\(\s*\)")]
    private static partial Regex IgnoresEveryFilter();
}
