using FastEndpoints;
using JxFinance.Common.Payees;
using JxFinance.Common.References;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<ISubscriptionDetectionService>(LifeTime.Scoped)]
public sealed class SubscriptionDetectionService(
    AppDbContext db,
    IClock clock,
    IReferenceGuard references) : ISubscriptionDetectionService
{
    public async Task<IReadOnlyList<SubscriptionCandidateResponse>> DetectAsync(CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var from = today.AddMonths(-SubscriptionDetection.LookBackMonths);

        var occurrences = await db.Transactions
            .Where(t => t.Type == FlowType.Expense && !t.IsSplit && t.Amount.Amount > 0 && t.Date >= from && t.Description != null)
            .Where(t => db.Accounts.Any(a => a.Id == t.AccountId && a.StartingBalance.Currency == t.Amount.Currency))
            .OrderByDescending(t => t.Date)
            .Select(t => new Occurrence(t.AccountId, t.CategoryId, t.Date, t.Amount.Amount, t.Description!))
            .Take(SubscriptionDetection.MaxScannedTransactions)
            .ToListAsync(cancellationToken);

        var groups = occurrences
            .Select(o => (Key: new GroupKey(o.AccountId, SubscriptionDescription.Normalize(o.Description)), Occurrence: o))
            .Where(pair => pair.Key.Description.Length > 0)
            .ToLookup(pair => pair.Key, pair => pair.Occurrence);

        var covered = await CoveredAsync(cancellationToken);
        var dismissed = await DismissedAsync(cancellationToken);

        var candidates = new List<SubscriptionCandidateResponse>();
        foreach (var members in groups)
        {
            if (dismissed.Contains(members.Key) || IsCovered(covered, members.Key))
            {
                continue;
            }

            if (Candidate(members.Key, members) is { } candidate)
            {
                candidates.Add(candidate);
            }
        }

        var shown = candidates
            .OrderBy(c => c.NextExpectedDate)
            .ThenBy(c => c.Description, StringComparer.Ordinal)
            .Take(SubscriptionDetection.MaxCandidates)
            .ToList();
        var names = await db.PayeeNamesForAsync(shown.Select(c => c.Description), cancellationToken);
        return shown.Select(c => c with { Name = names.GetValueOrDefault(c.Description) }).ToList();
    }

    public async Task<Result<Guid>> DismissAsync(
        DismissSubscriptionCandidateRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        if (await references.AccountExistsAsync(accountId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        var description = SubscriptionDescription.Normalize(request.Description);
        var existing = await db.SubscriptionDismissals
            .FirstOrDefaultAsync(d => d.AccountId == accountId && d.Description == description, cancellationToken);
        if (existing is not null)
        {
            return existing.Id.Value;
        }

        var dismissal = new SubscriptionDismissal { AccountId = accountId, Description = description };
        db.SubscriptionDismissals.Add(dismissal);
        await db.SaveChangesAsync(cancellationToken);

        return dismissal.Id.Value;
    }

    private static SubscriptionCandidateResponse? Candidate(GroupKey key, IEnumerable<Occurrence> members)
    {
        var dates = members.Select(m => m.Date).Distinct().Order().ToList();
        if (dates.Count < SubscriptionDetection.MinimumOccurrences)
        {
            return null;
        }

        if (SubscriptionDetection.CadenceOf(dates) is not { } cadence)
        {
            return null;
        }

        if (SubscriptionDetection.TypicalAmount(members.Select(m => m.Amount).ToList()) is not { } typical)
        {
            return null;
        }

        var categories = members.Select(m => m.CategoryId).Distinct().ToList();
        var category = categories is [{ } single] ? single.Value : (Guid?)null;
        var last = dates[^1];

        return new SubscriptionCandidateResponse(
            key.Description,
            key.AccountId.Value,
            category,
            cadence,
            typical,
            dates,
            RecurringBill.Advance(last, cadence, last.Day));
    }

    private static bool IsCovered(IReadOnlyList<Coverage> covered, GroupKey key) =>
        covered.Any(c => c.Description == key.Description && (c.AccountId is null || c.AccountId == key.AccountId));

    private async Task<IReadOnlyList<Coverage>> CoveredAsync(CancellationToken cancellationToken)
    {
        var active = await db.RecurringBills
            .Where(b => b.IsActive)
            .Select(b => new { b.Name, b.MatchKey, b.AccountId })
            .ToListAsync(cancellationToken);

        return active
            .Select(b => new Coverage(PriceRiseMatcher.KeyOf(b.MatchKey, b.Name), b.AccountId))
            .Where(c => c.Description.Length > 0)
            .ToList();
    }

    private async Task<HashSet<GroupKey>> DismissedAsync(CancellationToken cancellationToken)
    {
        var rows = await db.SubscriptionDismissals
            .Select(d => new { d.AccountId, d.Description })
            .ToListAsync(cancellationToken);

        return rows.Select(d => new GroupKey(d.AccountId, d.Description)).ToHashSet();
    }

    private sealed record Occurrence(
        AccountId AccountId,
        CategoryId? CategoryId,
        DateOnly Date,
        decimal Amount,
        string Description);

    private readonly record struct GroupKey(AccountId AccountId, string Description);

    private readonly record struct Coverage(string Description, AccountId? AccountId);
}
