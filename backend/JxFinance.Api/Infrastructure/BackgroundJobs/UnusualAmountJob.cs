using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class UnusualAmountJob(
    IServiceScopeFactory scopeFactory,
    ILogger<UnusualAmountJob> logger) : PeriodicJob(scopeFactory, logger)
{
    public const int PageSize = 500;
    public const int MaxPagesPerRun = 40;
    public const int NotifyWithinDays = 45;
    public const int SummaryAbove = 3;
    public const int TitleMaxLength = 200;

    protected override string Name => "Unusual amount scan";

    protected override TimeSpan Interval => TimeSpan.FromMinutes(15);

    protected override Feature? RequiredFeature => Feature.UnusualAmounts;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var settings = services.GetRequiredService<IInstanceSettingsStore>().Current;

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.LockAsync(AppLock.UnusualAmounts, ct);

        var backfillStart = await db.Transactions.IgnoreQueryFilters().MinAsync(t => t.UnusualCheckedAt, ct);
        var pass = new Pass(db, clock.UtcNow, clock.Today.AddDays(-NotifyWithinDays), backfillStart);

        for (var page = 0; page < MaxPagesPerRun; page++)
        {
            var rows = await UncheckedAsync(db, ct);
            if (rows.Count == 0)
            {
                break;
            }

            foreach (var owner in rows.GroupBy(row => row.OwnerId))
            {
                await using var ownerScope = UserScope(owner.Key);
                var candidates = owner
                    .Select(row => new UnusualCandidate(
                        row.AccountId,
                        row.CategoryId,
                        row.Date,
                        row.ReportingAmount,
                        row.Description))
                    .ToList();
                var verdicts = await ownerScope.ServiceProvider.GetRequiredService<IUnusualAmountService>().EvaluateAsync(candidates, ct);
                await pass.StoreAsync(owner.ToList(), verdicts, ct);
            }

            if (settings.IsEnabled(Feature.RecurringBills))
            {
                await pass.ComparePricesAsync(rows, ct);
            }
        }

        await PublishAsync(db, services, pass, settings.ReportingCurrency, ct);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static Task<List<PageRow>> UncheckedAsync(AppDbContext db, CancellationToken ct) =>
        (from t in db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly)
         join a in db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly) on t.AccountId equals a.Id
         where t.UnusualCheckedAt == null && t.Type == FlowType.Expense && !t.IsSplit
         orderby t.Date, t.Id
         select new PageRow(
             t.Id,
             a.UserId,
             t.AccountId,
             t.CategoryId,
             t.Date,
             t.ReportingAmount,
             t.Amount.Amount,
             t.Amount.Currency,
             t.Description,
             t.Unusual != null,
             t.UnusualDismissedAt != null,
             t.UpdatedAt))
        .Take(PageSize)
        .ToListAsync(ct);

    private async Task PublishAsync(
        AppDbContext db,
        IServiceProvider services,
        Pass pass,
        Currency reportingCurrency,
        CancellationToken ct)
    {
        var flaggedIds = pass.Flagged.Select(f => (Guid?)f.Row.Id.Value).ToList();
        var alreadyFlagged = await db.Notifications
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(n => n.Type == NotificationType.UnusualAmount && flaggedIds.Contains(n.RelatedId))
            .Select(n => n.RelatedId!.Value)
            .ToHashSetAsync(ct);
        var flagged = pass.Flagged.Where(f => !alreadyFlagged.Contains(f.Row.Id.Value)).ToList();

        var billIds = pass.Rises.Select(r => (Guid?)r.BillId).Distinct().ToList();
        var raisedBefore = await db.Notifications
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(n => n.Type == NotificationType.RecurringPriceRise && billIds.Contains(n.RelatedId))
            .Select(n => n.Payload)
            .ToListAsync(ct);
        var raisedTransactions = raisedBefore.Select(p => p?.TransactionId).OfType<Guid>().ToHashSet();
        var rises = new List<PriceRise>();
        foreach (var owner in pass.Rises.Where(r => !raisedTransactions.Contains(r.TransactionId)).GroupBy(r => r.OwnerId))
        {
            await using var ownerScope = UserScope(owner.Key);
            var ownerDb = ownerScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var accountIds = owner.Select(r => r.AccountId).Distinct().ToList();
            var visible = await ownerDb.Accounts.Where(a => accountIds.Contains(a.Id)).Select(a => a.Id).ToHashSetAsync(ct);
            rises.AddRange(owner.Where(r => visible.Contains(r.AccountId)));
        }

        var publisher = services.GetRequiredService<INotificationPublisher>();
        await publisher.PreloadAsync(
            flagged.Select(f => f.Row.OwnerId).Concat(rises.Select(r => r.OwnerId)),
            ct);

        var notifications = new List<Notification>();
        foreach (var owner in flagged.GroupBy(f => f.Row.OwnerId))
        {
            var items = owner.ToList();
            if (items.Count > SummaryAbove)
            {
                notifications.Add(Summary(owner.Key, items));
            }
            else
            {
                notifications.AddRange(items.Select(item => Flag(item, reportingCurrency)));
            }
        }

        notifications.AddRange(rises.Select(Rise));
        foreach (var notification in notifications)
        {
            publisher.Publish(notification);
        }
    }

    private static Notification Flag(FlaggedRow item, Currency reportingCurrency) => new()
    {
        UserId = item.Row.OwnerId,
        Type = NotificationType.UnusualAmount,
        Title = Title(item.Row.Description),
        Payload = new NotificationPayload
        {
            TransactionId = item.Row.Id.Value,
            Amount = Amount(item.Row.ReportingAmount),
            TypicalAmount = Amount(item.Verdict.TypicalAmount),
            Factor = item.Verdict.Factor,
            Currency = reportingCurrency,
        },
        RelatedType = NotificationRelated.Transaction,
        RelatedId = item.Row.Id.Value,
    };

    private static Notification Summary(Guid ownerId, List<FlaggedRow> items)
    {
        var names = items.Select(i => i.Row.Description).OfType<string>().Distinct().Take(3).ToList();
        return new Notification
        {
            UserId = ownerId,
            Type = NotificationType.UnusualAmounts,
            Title = Title(string.Join(", ", names) + (items.Count > names.Count && names.Count > 0 ? "…" : string.Empty)),
            Payload = new NotificationPayload { Count = items.Count },
        };
    }

    private static Notification Rise(PriceRise rise) => new()
    {
        UserId = rise.OwnerId,
        Type = NotificationType.RecurringPriceRise,
        Title = Title(rise.BillName),
        Payload = new NotificationPayload
        {
            BillId = rise.BillId,
            TransactionId = rise.TransactionId,
            Amount = Amount(rise.Comparison.Charged),
            TypicalAmount = Amount(rise.Comparison.Expected),
            Currency = rise.Currency,
        },
        RelatedType = NotificationRelated.RecurringBill,
        RelatedId = rise.BillId,
    };

    private static string Amount(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

    private static string Title(string? text) =>
        string.IsNullOrWhiteSpace(text) ? "—" : TextLimit.Cut(text, TitleMaxLength);

    private sealed class Pass(AppDbContext db, DateTimeOffset now, DateOnly notifyFrom, DateTimeOffset? backfillStart)
    {
        public List<FlaggedRow> Flagged { get; } = [];

        public List<PriceRise> Rises { get; } = [];

        public async Task StoreAsync(List<PageRow> rows, IReadOnlyList<UnusualVerdict?> verdicts, CancellationToken ct)
        {
            var ids = rows.Select(r => r.Id.Value).ToArray();
            var updatedAts = rows.Select(r => r.UpdatedAt).ToArray();
            var bases = verdicts.Select(v => v?.Basis.ToString()).ToArray();
            var typicals = verdicts.Select(v => v?.TypicalAmount).ToArray();
            var factors = verdicts.Select(v => v?.Factor).ToArray();
            var samples = verdicts.Select(v => v?.SampleSize).ToArray();
            var stored = (await db.Database.SqlQuery<Guid>(
                    $"""
                    UPDATE "Transactions" AS t
                    SET "UnusualCheckedAt" = {now},
                        "UnusualBasis" = v.basis,
                        "UnusualTypicalAmount" = v.typical,
                        "UnusualFactor" = v.factor,
                        "UnusualSampleSize" = v.sample
                    FROM unnest({ids}, {updatedAts}, {bases}, {typicals}, {factors}, {samples})
                        AS v(id, updated_at, basis, typical, factor, sample)
                    WHERE t."Id" = v.id AND t."UpdatedAt" = v.updated_at
                    RETURNING t."Id" AS "Value"
                    """)
                .ToListAsync(ct))
                .ToHashSet();

            for (var index = 0; index < rows.Count; index++)
            {
                var row = rows[index];
                if (stored.Contains(row.Id.Value) && verdicts[index] is { } verdict && Notifies(row) && !row.WasFlagged && !row.Dismissed)
                {
                    Flagged.Add(new FlaggedRow(row, verdict));
                }
            }
        }

        public async Task ComparePricesAsync(List<PageRow> rows, CancellationToken ct)
        {
            var charges = rows
                .Where(row => Notifies(row) && row.Description != null && row.Amount > 0)
                .Select(row => new BankCharge(
                    row.Id.Value,
                    row.AccountId,
                    row.Date,
                    row.Amount,
                    row.Currency,
                    SubscriptionDescription.Normalize(row.Description)))
                .ToList();
            var accountIds = charges.Select(charge => charge.AccountId).Distinct().ToList();
            if (accountIds.Count == 0)
            {
                return;
            }

            var bills = await (
                    from b in db.RecurringBills.IgnoreQueryFilters(QueryFilters.OwnerOnly).AsNoTracking()
                    join a in db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly) on b.AccountId equals (AccountId?)a.Id
                    where b.IsActive && b.Shape == RecurringBillShape.Expense && accountIds.Contains(a.Id)
                    select new { Bill = b, a.StartingBalance.Currency })
                .ToListAsync(ct);
            var matched = charges
                .SelectMany(charge => bills
                    .Select(b => (charge, b.Bill, Target: BillMatchTarget.Of(b.Bill, b.Currency)))
                    .Where(m => PriceRiseMatcher.Matches(m.Target, charge)))
                .ToList();
            if (matched.Count == 0)
            {
                return;
            }

            var history = await PriceRiseMatcher.LoadChargesAsync(
                db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly),
                matched.Select(m => m.charge.AccountId).Distinct().ToList(),
                matched.Min(m => m.charge.Date),
                FlowType.Expense,
                ct);
            foreach (var (charge, bill, target) in matched)
            {
                if (PriceRiseMatcher.Compare(target, charge, history) is { IsRise: true } comparison)
                {
                    Rises.Add(new PriceRise(bill.UserId, charge.AccountId, bill.Id.Value, bill.Name, charge.TransactionId, comparison, target.Currency));
                }
            }
        }

        private bool Notifies(PageRow row) => row.UpdatedAt > backfillStart && row.Date >= notifyFrom;
    }

    private sealed record PageRow(
        TransactionId Id,
        Guid OwnerId,
        AccountId AccountId,
        CategoryId? CategoryId,
        DateOnly Date,
        decimal ReportingAmount,
        decimal Amount,
        Currency Currency,
        string? Description,
        bool WasFlagged,
        bool Dismissed,
        DateTimeOffset UpdatedAt);

    private sealed record FlaggedRow(PageRow Row, UnusualVerdict Verdict);

    private sealed record PriceRise(
        Guid OwnerId,
        AccountId AccountId,
        Guid BillId,
        string BillName,
        Guid TransactionId,
        PriceComparison Comparison,
        Currency Currency);
}
