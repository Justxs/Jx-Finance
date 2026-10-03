using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IDemoDataService>(LifeTime.Scoped)]
public sealed class DemoDataService(
    AppDbContext db,
    IInstanceSettingsStore store,
    ISettingsService settings,
    IClock clock) : IDemoDataService
{
    private static readonly HashSet<string> KeptTables = new(StringComparer.Ordinal)
    {
        "UserSessions",
        "PersonalApiTokens",
        "ApiIdempotencyKeys",
        "EmailMessages",
        "DiscordMessages",
        "TelegramMessages",
        "InstanceSettings",
        "ExchangeRates",
        "ManualExchangeRates",
    };

    private static readonly DomainError NotRemovable = new(
        ErrorCodes.SetupDemoNotRemovable,
        "Demo data can be removed only while it is loaded and you are the only member.");

    public async Task<Result> LoadAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!store.Current.SetupPending)
        {
            return new DomainError(ErrorCodes.SetupNotPending, "Demo data can be loaded only during the guided setup.");
        }

        if (await DemoDataCommand.HasAccountsAsync(db, userId, cancellationToken))
        {
            return new DomainError(ErrorCodes.SetupLedgerNotEmpty, "Demo data can be loaded only into an empty ledger.");
        }

        await DemoDataCommand.SeedAsync(db, userId, clock, store.Current.ReportingCurrency, cancellationToken);
        await settings.MarkDemoDataAsync(true, cancellationToken);
        return Result.Success();
    }

    public async Task<Result> RemoveAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!store.Current.DemoData || await db.Users.AnyAsync(u => u.Id != userId, cancellationToken))
        {
            return NotRemovable;
        }

        var emptied = BackupDatabase.ReadShapes(db)
            .Where(table => !table.Name.StartsWith("AspNet", StringComparison.Ordinal) && !KeptTables.Contains(table.Name))
            .Select(table => table.QuotedName);
        var truncate = $"TRUNCATE TABLE {string.Join(", ", emptied)}";

        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(truncate, cancellationToken);
            await StarterCategories.SeedAsync(db, userId, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        db.ChangeTracker.Clear();
        await settings.MarkDemoDataAsync(false, cancellationToken);
        return Result.Success();
    }
}
