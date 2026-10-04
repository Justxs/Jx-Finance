using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Tags.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

internal static class CategoryAndTagRestores
{
    private static readonly DomainError TagGone =
        new(ErrorCodes.RestoreReferenceMissing, "The tag this belonged to was deleted, so it cannot come back as it was.");

    internal static async Task<Result> RestoreBudgetAsync(TrashRestore r, Budget budget)
    {
        var targetLives = budget.TagId is { } tagId
            ? await r.TagLivesAsync(tagId)
            : await r.CategoryLivesAsync(budget.CategoryId!.Value);
        if (!targetLives)
        {
            return budget.TagId is null ? LedgerRestores.CategoryGone : TagGone;
        }

        var taken = await r.Db.Budgets.AnyAsync(
            b => b.CategoryId == budget.CategoryId && b.TagId == budget.TagId && b.Period == budget.Period,
            r.CancellationToken);
        if (taken)
        {
            return new DomainError(
                ErrorCodes.RestoreSlotTaken,
                $"That {(budget.TagId is null ? "category" : "tag")} already has a {budget.Period.ToString().ToLowerInvariant()} budget.");
        }

        return Result.Success();
    }

    internal static async Task<Result> RestoreCategoryAsync(TrashRestore r, Category category)
    {
        var db = r.Db;
        var now = r.Clock.UtcNow;
        var categoryId = category.Id;
        CategoryId? restoredId = categoryId;

        var transactionIds = r.Entry.Remembered<TransactionId>(DeletionChangeKind.TransactionCategory);
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => transactionIds.Contains(t.Id) && t.CategoryId == null && !t.IsSplit && t.Type == category.Type)
            .SetCategoryAsync(restoredId, now, r.CancellationToken);

        var lineIds = r.Entry.Remembered(DeletionChangeKind.LineCategory);
        await db.TransactionLines
            .Where(l => lineIds.Contains(l.Id) && l.CategoryId == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(l => l.CategoryId, restoredId), r.CancellationToken);
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => db.TransactionLines.Any(l => lineIds.Contains(l.Id) && l.TransactionId == t.Id && l.CategoryId == restoredId))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UpdatedAt, now), r.CancellationToken);

        var billIds = r.Entry.Remembered<RecurringBillId>(DeletionChangeKind.RecurringBillCategory);
        var shape = category.Type == FlowType.Income ? RecurringBillShape.Income : RecurringBillShape.Expense;
        await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => billIds.Contains(b.Id) && b.CategoryId == null && b.Shape == shape)
            .ExecuteUpdateAsync(setters => setters.SetProperty(b => b.CategoryId, restoredId), r.CancellationToken);

        var budgetIds = r.Entry.Remembered<BudgetId>(DeletionChangeKind.Budget);
        var budgets = await db.Budgets
            .IgnoreQueryFilters()
            .Where(b => budgetIds.Contains(b.Id) && b.IsDeleted && b.CategoryId == categoryId)
            .ToListAsync(r.CancellationToken);
        foreach (var budget in budgets)
        {
            if (await BudgetMayReturnAsync(r, budget, category.UserId, category.Scope, category.HouseholdId))
            {
                budget.IsDeleted = false;
            }
        }

        var childIds = r.Entry.Remembered<CategoryId>(DeletionChangeKind.CategoryParent);
        if (category.ParentId is null)
        {
            await db.Categories
                .IgnoreQueryFilters()
                .Where(c => childIds.Contains(c.Id) && c.ParentId == null && c.Type == category.Type
                    && !db.Categories.Any(grandchild => grandchild.ParentId == c.Id))
                .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.ParentId, restoredId), r.CancellationToken);
        }

        return Result.Success();
    }

    private static async Task<bool> BudgetMayReturnAsync(
        TrashRestore r,
        Budget budget,
        Guid targetOwnerId,
        Scope targetScope,
        HouseholdId? targetHouseholdId)
    {
        var taken = await r.Db.Budgets
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                b => b.Id != budget.Id
                    && b.UserId == budget.UserId
                    && b.CategoryId == budget.CategoryId
                    && b.TagId == budget.TagId
                    && b.Period == budget.Period,
                r.CancellationToken);
        if (taken)
        {
            return false;
        }

        return budget.UserId == targetOwnerId
            || (targetScope == Scope.Shared && targetHouseholdId is { } householdId
                && await r.IsLiveMemberAsync(householdId, budget.UserId));
    }

    internal static async Task<Result> RestoreTagAsync(TrashRestore r, Tag tag)
    {
        var db = r.Db;
        var tagId = tag.Id;
        if (await TagNames.TakenAsync(db, tag.UserId, tag.Name, tagId, r.CancellationToken))
        {
            return new DomainError(
                ErrorCodes.RestoreNameTaken,
                $"You already have another tag named \"{tag.Name}\". Rename or delete it first.");
        }

        var remembered = r.Entry.Remembered<TransactionId>(DeletionChangeKind.TransactionTag);
        var stored = await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => remembered.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(r.CancellationToken);
        var present = await db.TransactionTags
            .Where(x => x.TagId == tagId && remembered.Contains(x.TransactionId))
            .Select(x => x.TransactionId)
            .ToListAsync(r.CancellationToken);

        db.TransactionTags.AddRange(
            stored.Except(present).Select(transactionId => new TransactionTag { TransactionId = transactionId, TagId = tagId }));

        var budgetIds = r.Entry.Remembered<BudgetId>(DeletionChangeKind.Budget);
        var budgets = await db.Budgets
            .IgnoreQueryFilters()
            .Where(b => budgetIds.Contains(b.Id) && b.IsDeleted && b.TagId == tagId)
            .ToListAsync(r.CancellationToken);
        foreach (var budget in budgets)
        {
            if (await BudgetMayReturnAsync(r, budget, tag.UserId, tag.Scope, tag.HouseholdId))
            {
                budget.IsDeleted = false;
            }
        }

        return Result.Success();
    }

    internal static async Task<Result> RestoreTransactionGroupAsync(TrashRestore r, TransactionGroup group)
    {
        var db = r.Db;
        var ownerId = group.UserId;
        var householdId = group.HouseholdId;
        TransactionGroupId? restoredId = group.Id;
        var remembered = r.Entry.Remembered<TransactionId>(DeletionChangeKind.GroupMember);
        await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => remembered.Contains(t.Id)
                && (householdId == null
                    ? t.UserId == ownerId
                    : db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly)
                        .Any(a => a.Id == t.AccountId && a.Scope == Scope.Shared && a.HouseholdId == householdId))
                && (t.GroupId == null || !db.TransactionGroups.IgnoreQueryFilters(QueryFilters.OwnerOnly).Any(g => g.Id == t.GroupId)))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, restoredId), r.CancellationToken);

        return Result.Success();
    }

    internal static async Task<Result> RestoreRuleAsync(TrashRestore r, CategorizationRule rule)
    {
        var db = r.Db;
        var rules = await db.CategorizationRules.Ordered().ToListAsync(r.CancellationToken);
        if (rules.Count >= RuleLimits.MaxRulesPerUser)
        {
            return new DomainError(
                ErrorCodes.CollectionInvalidSize,
                $"You already have {RuleLimits.MaxRulesPerUser} rules. Delete one before restoring this one.");
        }

        var remembered = r.Entry.Remembered<TagId>(DeletionChangeKind.RuleTag);
        var tags = await db.Tags
            .IgnoreQueryFilters()
            .Where(t => remembered.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(r.CancellationToken);

        rules.Insert(Math.Clamp(rule.Position, 0, rules.Count), rule);
        rules.Renumber();

        var ruleId = rule.Id;
        db.CategorizationRuleTags.AddRange(tags.Select(tagId => new CategorizationRuleTag { RuleId = ruleId, TagId = tagId }));

        return Result.Success();
    }
}
