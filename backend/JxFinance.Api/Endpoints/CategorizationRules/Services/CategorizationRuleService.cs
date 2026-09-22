using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategorizationRules;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.CategorizationRules.Services;

[RegisterService<ICategorizationRuleService>(LifeTime.Scoped)]
public sealed class CategorizationRuleService(
    AppDbContext db,
    CategorizationRuleMapper mapper,
    IReferenceGuard references,
    IDeletionRecorder deletions) : ICategorizationRuleService
{
    public async Task<IReadOnlyList<CategorizationRuleWithTags>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rules = await db.CategorizationRules
            .OrderBy(r => r.Position)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        return await WithTagsAsync(rules, cancellationToken);
    }

    public async Task<Result<CategorizationRuleWithTags>> CreateAsync(
        CategorizationRule rule,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(rule, tagIds, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        var used = await db.CategorizationRules.CountAsync(cancellationToken);
        if (used >= RuleLimits.MaxRulesPerUser)
        {
            return new DomainError(
                ErrorCodes.CollectionInvalidSize,
                $"You already have {RuleLimits.MaxRulesPerUser} rules.");
        }

        rule.Position = used;
        db.CategorizationRules.Add(rule);
        db.CategorizationRuleTags.AddRange(mapper.ToTags(rule.Id, tagIds));
        await db.SaveChangesAsync(cancellationToken);

        return new CategorizationRuleWithTags(rule, Distinct(tagIds));
    }

    public async Task<Result<CategorizationRuleWithTags>> UpdateAsync(
        Guid id,
        Action<CategorizationRule> apply,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(id);
        var found = await db.CategorizationRules.FindOrNotFoundAsync(r => r.Id == ruleId, "Rule not found.", cancellationToken);
        if (!found.TryGetValue(out var rule))
        {
            return found.Error;
        }

        apply(rule);

        var error = await ValidateAsync(rule, tagIds, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.CategorizationRuleTags.Where(t => t.RuleId == ruleId).ExecuteDeleteAsync(cancellationToken);
        db.CategorizationRuleTags.AddRange(mapper.ToTags(ruleId, tagIds));
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return new CategorizationRuleWithTags(rule, Distinct(tagIds));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(id);
        var found = await db.CategorizationRules.FindOrNotFoundAsync(r => r.Id == ruleId, "Rule not found.", cancellationToken);
        if (!found.TryGetValue(out var rule))
        {
            return found.Error;
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var tagIds = await db.CategorizationRuleTags
            .Where(t => t.RuleId == ruleId)
            .Select(t => t.TagId)
            .ToListAsync(cancellationToken);
        var entry = deletions.Record(
            TrashKind.CategorizationRule,
            id,
            TrashLabel.Counted(rule.Name, (tagIds.Count, "tag", "tags")));
        entry.Remember(DeletionChangeKind.RuleTag, tagIds.Select(t => t.Value));

        await db.CategorizationRuleTags.Where(t => t.RuleId == ruleId).ExecuteDeleteAsync(cancellationToken);
        db.CategorizationRules.Remove(rule);
        await db.SaveChangesAsync(cancellationToken);

        var remaining = await db.CategorizationRules
            .OrderBy(r => r.Position)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        Renumber(remaining);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }

    public async Task<Result<IReadOnlyList<CategorizationRuleWithTags>>> MoveAsync(
        Guid id,
        MoveDirection direction,
        CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(id);
        var rules = await db.CategorizationRules
            .OrderBy(r => r.Position)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        var index = rules.FindIndex(r => r.Id == ruleId);
        if (index < 0)
        {
            return EntityLookup.NotFound("Rule not found.");
        }

        var target = direction == MoveDirection.Up ? index - 1 : index + 1;
        if (target >= 0 && target < rules.Count)
        {
            (rules[index], rules[target]) = (rules[target], rules[index]);
        }

        Renumber(rules);
        await db.SaveChangesAsync(cancellationToken);

        return Result<IReadOnlyList<CategorizationRuleWithTags>>.Success(await WithTagsAsync(rules, cancellationToken));
    }

    public async Task<Result<RunRulesResponse>> PreviewRunAsync(
        RunRulesRequest request,
        CancellationToken cancellationToken)
    {
        var matched = await MatchLedgerAsync(request, cancellationToken);

        return matched.IsFailure
            ? Result<RunRulesResponse>.Failure(matched.Error)
            : Summarize(matched.Value!, request.Recategorize);
    }

    public async Task<Result<RunRulesResponse>> RunAsync(RunRulesRequest request, CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var matched = await MatchLedgerAsync(request, cancellationToken);
        if (matched.IsFailure)
        {
            return matched.Error;
        }

        var now = DateTimeOffset.UtcNow;
        foreach (var match in matched.Value!)
        {
            if (match.Ids.Count == 0)
            {
                continue;
            }

            if (match.Item.Rule.CategoryId is { } categoryId)
            {
                await db.Transactions
                    .Where(t => match.Ids.Contains(t.Id))
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(t => t.CategoryId, categoryId)
                            .SetProperty(t => t.UpdatedAt, now),
                        cancellationToken);
            }

            await AddTagsAsync(match.Ids, match.Item.TagIds, cancellationToken);
        }

        var touched = matched.Value!.SelectMany(m => m.Ids).Distinct().ToList();
        if (touched.Count > 0)
        {
            var touchedAccounts = await db.Transactions
                .IgnoreQueryFilters()
                .Where(t => touched.Contains(t.Id))
                .Select(t => t.AccountId)
                .Distinct()
                .ToListAsync(cancellationToken);
            db.Audit.Summarise(
                AuditAction.Updated,
                AuditEntityKind.Transaction,
                TrashLabel.Counted("Categorization rules run", (touched.Count, "transaction", "transactions")),
                touched.Count,
                accounts: touchedAccounts);
        }

        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return Summarize(matched.Value!, request.Recategorize);
    }

    public async Task<IReadOnlyList<RuleSuggestion?>> SuggestAsync(
        AccountId accountId,
        IReadOnlyList<RuleCandidate> candidates,
        CancellationToken cancellationToken)
    {
        var rules = await GetAllAsync(cancellationToken);
        var applicable = rules.Where(r => r.Rule.AccountId is null || r.Rule.AccountId == accountId).ToList();
        if (applicable.Count == 0)
        {
            return candidates.Select(_ => (RuleSuggestion?)null).ToList();
        }

        var categoryTypes = await CategoryTypesAsync(applicable, cancellationToken);

        return candidates.Select(candidate => First(applicable, categoryTypes, candidate)).ToList();
    }

    private static RuleSuggestion? First(
        IReadOnlyList<CategorizationRuleWithTags> rules,
        IReadOnlyDictionary<CategoryId, FlowType> categoryTypes,
        RuleCandidate candidate)
    {
        foreach (var item in rules)
        {
            var rule = item.Rule;
            if (rule.CategoryId is { } categoryId
                && (!categoryTypes.TryGetValue(categoryId, out var categoryType) || categoryType != candidate.Type))
            {
                continue;
            }

            if (!RuleMatcher.AmountInRange(candidate.Amount, rule.MinAmount, rule.MaxAmount)
                || !RuleMatcher.Matches(rule.Match, rule.Pattern, candidate.Description))
            {
                continue;
            }

            return new RuleSuggestion(rule.Name, rule.CategoryId?.Value, item.TagIds);
        }

        return null;
    }

    private async Task<Result<List<LedgerMatch>>> MatchLedgerAsync(
        RunRulesRequest request,
        CancellationToken cancellationToken)
    {
        if (request.AccountId is { } requested
            && await references.AccountExistsAsync(new AccountId(requested), cancellationToken) is { } accountError)
        {
            return accountError;
        }

        var rules = await GetAllAsync(cancellationToken);
        var categoryTypes = await CategoryTypesAsync(rules, cancellationToken);

        var claimed = new List<TransactionId>();
        var matches = new List<LedgerMatch>(rules.Count);
        foreach (var item in rules)
        {
            var rule = item.Rule;
            FlowType? categoryType = null;
            if (rule.CategoryId is { } categoryId)
            {
                if (!categoryTypes.TryGetValue(categoryId, out var found))
                {
                    matches.Add(new LedgerMatch(item, []));
                    continue;
                }

                categoryType = found;
            }

            var query = db.Transactions.Where(t => !t.IsSplit);
            if (!request.Recategorize)
            {
                query = query.Where(t => t.CategoryId == null);
            }

            if (request.AccountId is { } chosen)
            {
                var chosenId = new AccountId(chosen);
                query = query.Where(t => t.AccountId == chosenId);
            }

            if (rule.AccountId is { } ruleAccountId)
            {
                query = query.Where(t => t.AccountId == ruleAccountId);
            }

            if (categoryType is { } type)
            {
                query = query.Where(t => t.Type == type);
            }

            if (rule.MinAmount is { } minimum)
            {
                query = query.Where(t => t.Amount.Amount >= minimum);
            }

            if (rule.MaxAmount is { } maximum)
            {
                query = query.Where(t => t.Amount.Amount <= maximum);
            }

            var pattern = RuleMatcher.LikePatternFor(rule.Match, rule.Pattern);
            query = query.Where(t =>
                t.Description != null && EF.Functions.ILike(t.Description, pattern, LikePattern.Escape));

            if (claimed.Count > 0)
            {
                query = query.Where(t => !claimed.Contains(t.Id));
            }

            var ids = await query.Select(t => t.Id).ToListAsync(cancellationToken);
            claimed.AddRange(ids);
            matches.Add(new LedgerMatch(item, ids));
        }

        return matches;
    }

    private async Task AddTagsAsync(
        IReadOnlyList<TransactionId> transactionIds,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        if (tagIds.Count == 0)
        {
            return;
        }

        var wanted = tagIds.Distinct().Select(id => new TagId(id)).ToList();
        var existing = await db.TransactionTags
            .Where(t => transactionIds.Contains(t.TransactionId) && wanted.Contains(t.TagId))
            .Select(t => new { t.TransactionId, t.TagId })
            .ToListAsync(cancellationToken);
        var present = existing.Select(t => (t.TransactionId, t.TagId)).ToHashSet();

        db.TransactionTags.AddRange(
            from transactionId in transactionIds
            from tagId in wanted
            where !present.Contains((transactionId, tagId))
            select new TransactionTag { TransactionId = transactionId, TagId = tagId });
    }

    private async Task<IReadOnlyDictionary<CategoryId, FlowType>> CategoryTypesAsync(
        IReadOnlyList<CategorizationRuleWithTags> rules,
        CancellationToken cancellationToken)
    {
        var wanted = rules
            .Select(r => r.Rule.CategoryId)
            .OfType<CategoryId>()
            .Distinct()
            .ToList();

        return wanted.Count == 0
            ? new Dictionary<CategoryId, FlowType>()
            : await db.Categories
                .Where(c => wanted.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Type, cancellationToken);
    }

    private static RunRulesResponse Summarize(IReadOnlyList<LedgerMatch> matches, bool recategorize) => new(
        matches.Select(m => new RunRulesRow(m.Item.Rule.Id.Value, m.Item.Rule.Name, m.Ids.Count)).ToList(),
        matches.Sum(m => m.Ids.Count),
        recategorize);

    private static void Renumber(List<CategorizationRule> rules)
    {
        for (var index = 0; index < rules.Count; index++)
        {
            rules[index].Position = index;
        }
    }

    private static List<Guid> Distinct(IReadOnlyList<Guid> tagIds) => tagIds.Distinct().ToList();

    private async Task<IReadOnlyList<CategorizationRuleWithTags>> WithTagsAsync(
        List<CategorizationRule> rules,
        CancellationToken cancellationToken)
    {
        if (rules.Count == 0)
        {
            return [];
        }

        var ids = rules.Select(r => r.Id).ToList();
        var links = await db.CategorizationRuleTags
            .Where(t => ids.Contains(t.RuleId))
            .ToListAsync(cancellationToken);
        var byRule = links
            .GroupBy(t => t.RuleId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<Guid>)group.Select(t => t.TagId.Value).ToList());

        return rules
            .Select(rule => new CategorizationRuleWithTags(rule, byRule.GetValueOrDefault(rule.Id, [])))
            .ToList();
    }

    private async Task<DomainError?> ValidateAsync(
        CategorizationRule rule,
        IReadOnlyList<Guid> tagIds,
        CancellationToken cancellationToken)
    {
        if (rule.AccountId is { } accountId
            && await references.AccountExistsAsync(accountId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        if (rule.CategoryId is { } categoryId
            && !await db.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken))
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Category does not exist.");
        }

        var wanted = tagIds.Distinct().Select(id => new TagId(id)).ToList();
        if (wanted.Count > 0 && await db.Tags.CountAsync(t => wanted.Contains(t.Id), cancellationToken) != wanted.Count)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Tag does not exist.");
        }

        return null;
    }

    private sealed record LedgerMatch(CategorizationRuleWithTags Item, IReadOnlyList<TransactionId> Ids);
}
