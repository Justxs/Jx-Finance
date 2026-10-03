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
            .Select(entity => entity.ClrType.FullName)
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Equal(GlobalEntities.Concat(ChildEntities).Select(type => type.FullName).Order(StringComparer.Ordinal), unowned);
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

        Assert.Equal(FilterBypassFiles.Order(StringComparer.Ordinal), bypassing);
    }

    [GeneratedRegex(@"\.IgnoreQueryFilters\(\s*\)")]
    private static partial Regex IgnoresEveryFilter();
}
