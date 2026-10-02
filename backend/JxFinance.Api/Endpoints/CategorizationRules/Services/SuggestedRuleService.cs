using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategorizationRules;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.CategorizationRules.DismissSuggestedRule;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.CategorizationRules.Services;

[RegisterService<ISuggestedRuleService>(LifeTime.Scoped)]
public sealed class SuggestedRuleService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IReferenceGuard references) : ISuggestedRuleService
{
    public async Task<IReadOnlyList<SuggestedRuleResponse>> GetAsync(
        Guid? transactionId,
        CancellationToken cancellationToken)
    {
        var rules = await db.CategorizationRules.AsNoTracking().ToListAsync(cancellationToken);
        if (rules.Count >= RuleLimits.MaxRulesPerUser)
        {
            return [];
        }

        var rows = await HistoryAsync(cancellationToken);
        var categoryTypes = await references.CategoryTypesAsync(
            rules.Select(rule => rule.CategoryId).Concat(rows.Select(row => row.CategoryId)),
            cancellationToken);
        var dismissed = await DismissedAsync(cancellationToken);

        var found = new List<Found>();
        foreach (var group in rows.ToLookup(row => row.Key))
        {
            if (group.Key.Length == 0)
            {
                continue;
            }

            var handFiled = group
                .Where(row => row.CategoryId is { } categoryId
                    && categoryTypes.ContainsKey(categoryId)
                    && !rules.Any(rule => RuleMatcher.Applies(rule, categoryTypes, row.Entry)))
                .GroupBy(row => row.CategoryId!.Value);
            foreach (var evidence in handFiled)
            {
                var items = evidence.ToList();
                if (items.Count >= SuggestedRules.Threshold
                    && !dismissed.Contains((group.Key, evidence.Key))
                    && Suggest(group.Key, evidence.Key, categoryTypes[evidence.Key], items, group.ToList(), rows)
                        is { } suggestion)
                {
                    found.Add(new Found(suggestion, items));
                }
            }
        }

        var chosen = transactionId is { } id
            ? found.Where(f => f.Items.Count == SuggestedRules.Threshold && f.Items.Any(row => row.Entry.Id.Value == id))
            : found;

        return chosen
            .Select(f => f.Suggestion)
            .OrderByDescending(s => s.Evidence)
            .ThenByDescending(s => s.LastSeen)
            .ThenBy(s => s.Key, StringComparer.Ordinal)
            .Take(SuggestedRules.MaxSuggestions)
            .ToList();
    }

    public async Task<Result<Guid>> DismissAsync(
        DismissSuggestedRuleRequest request,
        CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(request.CategoryId);
        if (await references.CategoryExistsAsync(categoryId, cancellationToken) is { } categoryError)
        {
            return categoryError;
        }

        var key = SubscriptionDescription.Normalize(request.Key);
        var existing = await db.SuggestedRuleDismissals
            .FirstOrDefaultAsync(d => d.Key == key && d.CategoryId == categoryId, cancellationToken);
        if (existing is not null)
        {
            return existing.Id.Value;
        }

        var dismissal = new SuggestedRuleDismissal { Key = key, CategoryId = categoryId };
        db.SuggestedRuleDismissals.Add(dismissal);
        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.ConflictDuplicate, "This suggestion was dismissed from another window just now."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return dismissal.Id.Value;
    }

    private static SuggestedRuleResponse? Suggest(
        string key,
        CategoryId categoryId,
        FlowType type,
        List<HistoryRow> evidence,
        List<HistoryRow> group,
        List<HistoryRow> rows)
    {
        if (group.Any(row => row.CategoryId is { } other && other != categoryId && row.Entry.Type == type))
        {
            return null;
        }

        var descriptions = evidence.Select(row => row.Entry.Description!).ToList();
        if (RulePatternFinder.For(descriptions, key) is not (var match, var pattern)
            || pattern.Length > RuleLimits.PatternMaxLength
            || !descriptions.TrueForAll(description => RuleMatcher.Matches(match, pattern, description))
            || rows.Exists(row => row.CategoryId is { } other
                && other != categoryId
                && row.Entry.Type == type
                && RuleMatcher.Matches(match, pattern, row.Entry.Description)))
        {
            return null;
        }

        var name = pattern.Length <= RuleLimits.NameMaxLength ? pattern : pattern[..RuleLimits.NameMaxLength].TrimEnd();
        return new SuggestedRuleResponse(key, name, match, pattern, categoryId.Value, evidence.Count, evidence[0].Date);
    }

    private async Task<List<HistoryRow>> HistoryAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        var from = clock.Today.AddMonths(-SuggestedRules.LookBackMonths);

        var rows = await db.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.IsSplit && t.Amount.Amount > 0 && t.Description != null && t.Date >= from)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Take(UnusualAmountService.MaxHistoryRows)
            .Select(t => new { t.Id, t.AccountId, t.Type, t.Amount.Amount, t.Description, t.PayeeKey, t.CategoryId, t.Date })
            .ToListAsync(cancellationToken);

        return rows
            .Select(t => new HistoryRow(
                new LedgerEntry(t.Id, t.AccountId, t.Type, t.Amount, t.Description),
                t.PayeeKey ?? string.Empty,
                t.CategoryId,
                t.Date))
            .ToList();
    }

    private async Task<HashSet<(string Key, CategoryId CategoryId)>> DismissedAsync(CancellationToken cancellationToken)
    {
        var rows = await db.SuggestedRuleDismissals
            .Select(d => new { d.Key, d.CategoryId })
            .ToListAsync(cancellationToken);

        return rows.Select(d => (d.Key, d.CategoryId)).ToHashSet();
    }

    private sealed record HistoryRow(LedgerEntry Entry, string Key, CategoryId? CategoryId, DateOnly Date);

    private sealed record Found(SuggestedRuleResponse Suggestion, List<HistoryRow> Items);
}
