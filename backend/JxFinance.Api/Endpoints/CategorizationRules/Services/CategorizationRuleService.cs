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
using JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.CategorizationRules.Services;

[RegisterService<ICategorizationRuleService>(LifeTime.Scoped)]
public sealed class CategorizationRuleService(
    AppDbContext db,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IClock clock) : ICategorizationRuleService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Rule not found.");

    public async Task<IReadOnlyList<CategorizationRuleResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rules = await LoadAllAsync(cancellationToken);
        return rules.Select(r => r.ToResponse()).ToList();
    }

    public async Task<Result<CategorizationRuleResponse>> CreateAsync(
        CreateCategorizationRuleRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(request, cancellationToken);
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

        var rule = request.ToEntity();
        rule.Position = used;
        db.CategorizationRules.Add(rule);
        db.CategorizationRuleTags.AddRange(request.TagIds.ToRuleTags(rule.Id));
        await db.SaveChangesAsync(cancellationToken);

        return new CategorizationRuleWithTags(rule, Distinct(request.TagIds)).ToResponse();
    }

    public async Task<Result<CategorizationRuleResponse>> UpdateAsync(
        UpdateCategorizationRuleRequest request,
        CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(request.Id);
        if (await db.CategorizationRules.FirstOrDefaultAsync(r => r.Id == ruleId, cancellationToken) is not { } rule)
        {
            return NotFound;
        }

        var error = await ValidateAsync(request, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        request.ApplyTo(rule);

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.CategorizationRuleTags.Where(t => t.RuleId == ruleId).ExecuteDeleteAsync(cancellationToken);
        db.CategorizationRuleTags.AddRange(request.TagIds.ToRuleTags(ruleId));
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return new CategorizationRuleWithTags(rule, Distinct(request.TagIds)).ToResponse();
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(id);

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var rules = await db.CategorizationRules.Ordered().ToListAsync(cancellationToken);
        var rule = rules.Find(r => r.Id == ruleId);
        if (rule is null)
        {
            return NotFound;
        }

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
        rules.Remove(rule);
        rules.Renumber();
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }

    public async Task<Result<IReadOnlyList<CategorizationRuleResponse>>> MoveAsync(
        Guid id,
        MoveDirection direction,
        CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(id);
        var rules = await db.CategorizationRules.Ordered().ToListAsync(cancellationToken);

        var index = rules.FindIndex(r => r.Id == ruleId);
        if (index < 0)
        {
            return NotFound;
        }

        var target = direction == MoveDirection.Up ? index - 1 : index + 1;
        if (target >= 0 && target < rules.Count)
        {
            (rules[index], rules[target]) = (rules[target], rules[index]);
        }

        rules.Renumber();
        await db.SaveChangesAsync(cancellationToken);

        var moved = await WithTagsAsync(rules, cancellationToken);
        return Result<IReadOnlyList<CategorizationRuleResponse>>.Success(moved.Select(r => r.ToResponse()).ToList());
    }

    public async Task<Result<RunRulesResponse>> PreviewRunAsync(
        RunRulesRequest request,
        CancellationToken cancellationToken)
    {
        var matched = await MatchLedgerAsync(request, cancellationToken);

        return matched.Map(matches => Summarize(matches, request.Recategorize));
    }

    public async Task<Result<RunRulesResponse>> RunAsync(RunRulesRequest request, CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var matched = await MatchLedgerAsync(request, cancellationToken);
        if (!matched.TryGetValue(out var matches))
        {
            return matched.Error;
        }

        var now = clock.UtcNow;
        var categorized = matches
            .Where(m => m.Rows.Count > 0 && m.Item.Rule.CategoryId is not null)
            .GroupBy(m => m.Item.Rule.CategoryId!.Value);
        foreach (var group in categorized)
        {
            var categoryId = group.Key;
            var ids = group.SelectMany(m => m.Rows).Select(row => row.Id).ToList();
            await db.Transactions
                .Where(t => ids.Contains(t.Id))
                .SetCategoryAsync(categoryId, now, cancellationToken);
        }

        await AddTagsAsync(matches, cancellationToken);

        var touched = matches.SelectMany(m => m.Rows).ToList();
        if (touched.Count > 0)
        {
            db.Audit.Summarise(
                AuditAction.Updated,
                AuditEntityKind.Transaction,
                TrashLabel.Counted("Categorization rules run", (touched.Count, "transaction", "transactions")),
                touched.Count,
                accounts: touched.Select(row => row.AccountId).Distinct().ToList());
        }

        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return Summarize(matches, request.Recategorize);
    }

    public async Task<IReadOnlyList<RuleSuggestion?>> SuggestAsync(
        AccountId? accountId,
        IReadOnlyList<RuleCandidate> candidates,
        CancellationToken cancellationToken)
    {
        var rules = await LoadAllAsync(cancellationToken);
        var applicable = rules.Where(r => r.Rule.AccountId is null || r.Rule.AccountId == accountId).ToList();
        if (applicable.Count == 0)
        {
            return candidates.Select(_ => (RuleSuggestion?)null).ToList();
        }

        var categoryTypes = await references.CategoryTypesAsync(applicable.Select(r => r.Rule.CategoryId), cancellationToken);

        return candidates
            .Select(candidate =>
            {
                var entry = new LedgerEntry(default, accountId ?? default, candidate.Type, candidate.Amount, candidate.Description);
                return applicable.FirstOrDefault(item => RuleMatcher.Applies(item.Rule, categoryTypes, entry)) is { } item
                    ? new RuleSuggestion(item.Rule.Name, item.Rule.CategoryId?.Value, item.TagIds)
                    : null;
            })
            .ToList();
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

        var rules = await LoadAllAsync(cancellationToken);
        var categoryTypes = await references.CategoryTypesAsync(rules.Select(r => r.Rule.CategoryId), cancellationToken);
        var candidates = await CandidatesAsync(request, cancellationToken);

        var byRule = candidates
            .Select(row => (Row: row, Rule: rules.FirstOrDefault(item => RuleMatcher.Applies(item.Rule, categoryTypes, row))))
            .Where(pair => pair.Rule is not null)
            .ToLookup(pair => pair.Rule!.Rule.Id, pair => pair.Row);

        return rules.Select(item => new LedgerMatch(item, byRule[item.Rule.Id].ToList())).ToList();
    }

    private async Task<List<LedgerEntry>> CandidatesAsync(RunRulesRequest request, CancellationToken cancellationToken)
    {
        var query = db.Transactions.AsNoTracking().Where(t => !t.IsSplit && t.Description != null);
        if (!request.Recategorize)
        {
            query = query.Where(t => t.CategoryId == null);
        }

        if (request.AccountId is { } chosen)
        {
            var chosenId = new AccountId(chosen);
            query = query.Where(t => t.AccountId == chosenId);
        }

        return await query
            .Select(t => new LedgerEntry(t.Id, t.AccountId, t.Type, t.Amount.Amount, t.Description))
            .ToListAsync(cancellationToken);
    }

    private async Task AddTagsAsync(IReadOnlyList<LedgerMatch> matches, CancellationToken cancellationToken)
    {
        var wanted = matches
            .SelectMany(match => match.Item.TagIds
                .Distinct()
                .SelectMany(tagId => match.Rows.Select(row => (row.Id, Tag: new TagId(tagId)))))
            .ToList();
        if (wanted.Count == 0)
        {
            return;
        }

        var transactionIds = wanted.Select(pair => pair.Id).Distinct().ToList();
        var tagIds = wanted.Select(pair => pair.Tag).Distinct().ToList();
        var existing = await db.TransactionTags
            .Where(t => transactionIds.Contains(t.TransactionId) && tagIds.Contains(t.TagId))
            .Select(t => new { t.TransactionId, t.TagId })
            .ToListAsync(cancellationToken);
        var present = existing.Select(t => (t.TransactionId, t.TagId)).ToHashSet();

        db.TransactionTags.AddRange(wanted
            .Where(pair => !present.Contains((pair.Id, pair.Tag)))
            .Select(pair => new TransactionTag { TransactionId = pair.Id, TagId = pair.Tag }));
    }

    private static RunRulesResponse Summarize(IReadOnlyList<LedgerMatch> matches, bool recategorize) => new(
        matches.Select(m => new RunRulesRow(m.Item.Rule.Id.Value, m.Item.Rule.Name, m.Rows.Count)).ToList(),
        matches.Sum(m => m.Rows.Count),
        recategorize);

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
            .AsNoTracking()
            .Where(t => ids.Contains(t.RuleId))
            .ToListAsync(cancellationToken);
        var byRule = links
            .GroupBy(t => t.RuleId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<Guid>)group.Select(t => t.TagId.Value).ToList());

        return rules
            .Select(rule => new CategorizationRuleWithTags(rule, byRule.GetValueOrDefault(rule.Id, [])))
            .ToList();
    }

    private async Task<IReadOnlyList<CategorizationRuleWithTags>> LoadAllAsync(CancellationToken cancellationToken)
    {
        var rules = await db.CategorizationRules.AsNoTracking().Ordered().ToListAsync(cancellationToken);

        return await WithTagsAsync(rules, cancellationToken);
    }

    private async Task<DomainError?> ValidateAsync(
        ICategorizationRuleInput input,
        CancellationToken cancellationToken)
    {
        if (input.AccountId is { } accountId
            && await references.AccountExistsAsync(new AccountId(accountId), cancellationToken) is { } accountError)
        {
            return accountError;
        }

        if (input.CategoryId is { } categoryId
            && await references.CategoryExistsAsync(new CategoryId(categoryId), cancellationToken) is { } categoryError)
        {
            return categoryError;
        }

        return await references.TagsExistAsync(input.TagIds, cancellationToken);
    }

    private sealed record LedgerMatch(CategorizationRuleWithTags Item, IReadOnlyList<LedgerEntry> Rows);
}
