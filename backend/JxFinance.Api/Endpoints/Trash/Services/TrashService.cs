using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Holdings;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Households;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Trash.GetTrash;
using JxFinance.Endpoints.Trash.Interfaces;
using JxFinance.Endpoints.Trash.Mappers;
using JxFinance.Endpoints.Trash.RestoreDeleted;
using JxFinance.Endpoints.Trash.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

[RegisterService<ITrashService>(LifeTime.Scoped)]
public sealed class TrashService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IInstanceSettingsStore settings,
    IHoldingLedger ledger,
    TrashMapper mapper) : ITrashService
{
    private static readonly DomainError Gone =
        new(ErrorCodes.ResourceNotFound, "That record is no longer stored and cannot be restored.");

    private static readonly DomainError AccountGone =
        new(ErrorCodes.RestoreReferenceMissing, "The account this belonged to is archived. Restore the account first.");

    private static readonly DomainError CategoryGone =
        new(ErrorCodes.RestoreReferenceMissing, "The category this belonged to was deleted, so it cannot come back as it was.");

    private static readonly DomainError FeeGone =
        new(ErrorCodes.RestoreReferenceMissing, "The fee transaction of this conversion is no longer stored.");

    private static readonly DomainError FeeDeletedSeparately = new(
        ErrorCodes.RestoreCompanionDeleted,
        "The fee transaction of this conversion was deleted on its own. Restore that transaction first.");

    private static readonly DomainError LinesGone = new(
        ErrorCodes.RestoreDetailsLost,
        "The split lines of this transaction are no longer stored, so it would come back without its categories.");

    private static readonly DomainError SecurityGone =
        new(ErrorCodes.RestoreReferenceMissing, "The security this entry was recorded against is no longer stored.");

    private static readonly DomainError SecurityChanged = new(
        ErrorCodes.RestoreSecurityChanged,
        "The security this entry was traded in has a different currency now, so the entry would no longer match it.");

    private static readonly DomainError SaleUncovered = new(
        ErrorCodes.HoldingOversold,
        "This sale would sell more than is held on its date now. Restore or record the purchase it sold first.");

    private static readonly DomainError LaterSalesDepend = new(
        ErrorCodes.HoldingDependentSales,
        "Later sales now depend on the shares this entry would take back. Delete or correct those first.");

    public async Task<PagedResponse<TrashEntryResponse>> GetPageAsync(
        GetTrashRequest request,
        CancellationToken cancellationToken)
    {
        var windowStart = DeletionEntry.WindowStart(clock.UtcNow);
        var query = db.DeletionEntries.Where(e => e.RestoredAt == null && e.DeletedAt >= windowStart);
        foreach (var disabled in TrashKinds.Disabled(settings.Current))
        {
            query = query.Where(e => e.Kind != disabled);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(e => e.DeletedAt).ThenByDescending(e => e.CreatedAt),
            cancellationToken);

        return page.Map(mapper.FromEntity);
    }

    public async Task<Result> RestoreAsync(RestoreDeletedRequest request, CancellationToken cancellationToken)
    {
        var entry = await db.DeletionEntries
            .Where(e => e.Kind == request.Kind && e.EntityId == request.EntityId)
            .OrderByDescending(e => e.DeletedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (entry is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Nothing you deleted matches that record.");
        }

        if (!TrashKinds.IsEnabled(entry.Kind, settings.Current))
        {
            return new DomainError(
                ErrorCodes.FeatureDisabled,
                $"The {TrashKinds.FeatureOf(entry.Kind)} feature is turned off for this installation.");
        }

        if (entry.RestoredAt is not null)
        {
            return Result.Success();
        }

        if (entry.DeletedAt < DeletionEntry.WindowStart(clock.UtcNow))
        {
            return new DomainError(
                ErrorCodes.RestoreExpired,
                $"This was deleted more than {DeletionEntry.RetentionDays} days ago and can no longer be restored.");
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var restored = entry.Kind switch
        {
            TrashKind.Transaction => await RestoreTransactionAsync(entry, cancellationToken),
            TrashKind.Transfer => await RestoreTransferAsync(entry, cancellationToken),
            TrashKind.Conversion => await RestoreConversionAsync(entry, cancellationToken),
            TrashKind.Budget => await RestoreBudgetAsync(entry, cancellationToken),
            TrashKind.Goal => await RestoreGoalAsync(entry, cancellationToken),
            TrashKind.Asset => await RestoreAssetAsync(entry, cancellationToken),
            TrashKind.Debt => await RestoreDebtAsync(entry, cancellationToken),
            TrashKind.RecurringBill => await RestoreRecurringBillAsync(entry, cancellationToken),
            TrashKind.InvestmentTransaction => await RestoreInvestmentTransactionAsync(entry, cancellationToken),
            TrashKind.Category => await RestoreCategoryAsync(entry, cancellationToken),
            TrashKind.Tag => await RestoreTagAsync(entry, cancellationToken),
            TrashKind.CategorizationRule => await RestoreRuleAsync(entry, cancellationToken),
            TrashKind.Household => await RestoreHouseholdAsync(entry, cancellationToken),
            _ => Result.Failure(Gone),
        };
        if (restored.IsFailure)
        {
            return restored;
        }

        entry.RestoredAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return Result.Success();
    }

    private async Task<Result> RestoreTransactionAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(entry.EntityId);
        var transaction = await db.Transactions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return Gone;
        }

        if (!await AccountVisibleAsync(transaction.AccountId, cancellationToken))
        {
            return AccountGone;
        }

        if (!transaction.IsDeleted)
        {
            return Result.Success();
        }

        if (transaction.CategoryId is { } categoryId && !await CategoryLivesAsync(categoryId, cancellationToken))
        {
            return CategoryGone;
        }

        if (transaction.IsSplit &&
            !await db.TransactionLines.AnyAsync(l => l.TransactionId == transactionId, cancellationToken))
        {
            return LinesGone;
        }

        transaction.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreTransferAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var transferId = new TransferId(entry.EntityId);
        var transfer = await db.Transfers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken);
        if (transfer is null)
        {
            return Gone;
        }

        var visible = await db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId,
            cancellationToken);
        if (visible != 2)
        {
            return AccountGone;
        }

        if (!transfer.IsDeleted)
        {
            return Result.Success();
        }

        transfer.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreConversionAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(entry.EntityId);
        var conversion = await db.CurrencyConversions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == conversionId, cancellationToken);
        if (conversion is null)
        {
            return Gone;
        }

        if (!await AccountVisibleAsync(conversion.AccountId, cancellationToken))
        {
            return AccountGone;
        }

        if (!conversion.IsDeleted)
        {
            return Result.Success();
        }

        if ((conversion.FeeTransactionId?.Value ?? entry.CompanionId) is { } feeId)
        {
            var typedFeeId = new TransactionId(feeId);
            var fee = await db.Transactions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == typedFeeId, cancellationToken);
            if (fee is null)
            {
                return FeeGone;
            }

            if (fee.IsDeleted)
            {
                if (entry.CompanionId != feeId)
                {
                    return FeeDeletedSeparately;
                }

                fee.IsDeleted = false;
            }

            conversion.FeeTransactionId = typedFeeId;
        }

        conversion.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreBudgetAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(entry.EntityId);
        var budget = await db.Budgets
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == budgetId && b.UserId == currentUser.Id, cancellationToken);
        if (budget is null)
        {
            return Gone;
        }

        if (!budget.IsDeleted)
        {
            return Result.Success();
        }

        if (!await CategoryLivesAsync(budget.CategoryId, cancellationToken))
        {
            return CategoryGone;
        }

        var taken = await db.Budgets.AnyAsync(
            b => b.CategoryId == budget.CategoryId && b.Period == budget.Period,
            cancellationToken);
        if (taken)
        {
            return new DomainError(
                ErrorCodes.RestoreSlotTaken,
                $"That category already has a {budget.Period.ToString().ToLowerInvariant()} budget.");
        }

        budget.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreGoalAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(entry.EntityId);
        var goal = await db.Goals
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == currentUser.Id, cancellationToken);
        if (goal is null)
        {
            return Gone;
        }

        if (!goal.IsDeleted)
        {
            return Result.Success();
        }

        goal.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreAssetAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(entry.EntityId);
        var asset = await db.Assets
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == assetId && a.UserId == currentUser.Id, cancellationToken);
        if (asset is null)
        {
            return Gone;
        }

        if (!asset.IsDeleted)
        {
            return Result.Success();
        }

        asset.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreDebtAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(entry.EntityId);
        var debt = await db.Debts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(d => d.Id == debtId && d.UserId == currentUser.Id, cancellationToken);
        if (debt is null)
        {
            return Gone;
        }

        if (!debt.IsDeleted)
        {
            return Result.Success();
        }

        debt.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreRecurringBillAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(entry.EntityId);
        var bill = await db.RecurringBills
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == billId && b.UserId == currentUser.Id, cancellationToken);
        if (bill is null)
        {
            return Gone;
        }

        if (!bill.IsDeleted)
        {
            return Result.Success();
        }

        if (bill.AccountId is { } accountId && !await AccountVisibleAsync(accountId, cancellationToken))
        {
            return AccountGone;
        }

        if (bill.ToAccountId is { } toAccountId && !await AccountVisibleAsync(toAccountId, cancellationToken))
        {
            return AccountGone;
        }

        if (bill.CategoryId is { } categoryId && !await CategoryLivesAsync(categoryId, cancellationToken))
        {
            return CategoryGone;
        }

        bill.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreInvestmentTransactionAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var entryId = new InvestmentTransactionId(entry.EntityId);
        var investment = await db.InvestmentTransactions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == entryId, cancellationToken);
        if (investment is null)
        {
            return Gone;
        }

        if (!await AccountVisibleAsync(investment.AccountId, cancellationToken))
        {
            return AccountGone;
        }

        if (!investment.IsDeleted)
        {
            return Result.Success();
        }

        if (investment.SecurityId is { } securityId)
        {
            var currency = await db.Securities
                .Where(s => s.Id == securityId)
                .Select(s => (Currency?)s.Currency)
                .FirstOrDefaultAsync(cancellationToken);
            if (currency is null)
            {
                return SecurityGone;
            }

            if (investment.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell
                && investment.CashAmount.Currency != currency)
            {
                return SecurityChanged;
            }

            var oversold = await ledger.FirstOversoldSaleAsync(
                investment.AccountId,
                securityId,
                history => history.Append(investment),
                cancellationToken);
            if (oversold is { } saleId)
            {
                return saleId == entryId ? SaleUncovered : LaterSalesDepend;
            }
        }

        investment.IsDeleted = false;

        return Result.Success();
    }

    private async Task<Result> RestoreCategoryAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(entry.EntityId);
        var category = await db.Categories
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.UserId == currentUser.Id, cancellationToken);
        if (category is null)
        {
            return Gone;
        }

        if (!category.IsDeleted)
        {
            return Result.Success();
        }

        await db.Entry(entry).Collection(e => e.Changes).LoadAsync(cancellationToken);
        category.IsDeleted = false;
        var now = clock.UtcNow;
        CategoryId? restoredId = categoryId;

        var transactionIds = entry.Remembered(DeletionChangeKind.TransactionCategory)
            .Select(id => new TransactionId(id))
            .ToList();
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => transactionIds.Contains(t.Id) && t.CategoryId == null && !t.IsSplit && t.Type == category.Type)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(t => t.CategoryId, restoredId).SetProperty(t => t.UpdatedAt, now),
                cancellationToken);

        var lineIds = entry.Remembered(DeletionChangeKind.LineCategory);
        await db.TransactionLines
            .Where(l => lineIds.Contains(l.Id) && l.CategoryId == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(l => l.CategoryId, restoredId), cancellationToken);

        var billIds = entry.Remembered(DeletionChangeKind.RecurringBillCategory)
            .Select(id => new RecurringBillId(id))
            .ToList();
        var shape = category.Type == FlowType.Income ? RecurringBillShape.Income : RecurringBillShape.Expense;
        await db.RecurringBills
            .IgnoreQueryFilters()
            .Where(b => billIds.Contains(b.Id) && b.CategoryId == null && b.Shape == shape)
            .ExecuteUpdateAsync(setters => setters.SetProperty(b => b.CategoryId, restoredId), cancellationToken);

        var budgetIds = entry.Remembered(DeletionChangeKind.Budget).Select(id => new BudgetId(id)).ToList();
        var budgets = await db.Budgets
            .IgnoreQueryFilters()
            .Where(b => budgetIds.Contains(b.Id) && b.IsDeleted && b.CategoryId == categoryId)
            .ToListAsync(cancellationToken);
        foreach (var budget in budgets)
        {
            if (await BudgetMayReturnAsync(budget, category, cancellationToken))
            {
                budget.IsDeleted = false;
            }
        }

        return Result.Success();
    }

    private async Task<bool> BudgetMayReturnAsync(Budget budget, Category category, CancellationToken cancellationToken)
    {
        var taken = await db.Budgets
            .IgnoreQueryFilters()
            .AnyAsync(
                b => !b.IsDeleted
                    && b.Id != budget.Id
                    && b.UserId == budget.UserId
                    && b.CategoryId == budget.CategoryId
                    && b.Period == budget.Period,
                cancellationToken);
        if (taken)
        {
            return false;
        }

        return budget.UserId == category.UserId
            || (category is { Scope: Scope.Shared, HouseholdId: { } householdId }
                && await IsLiveMemberAsync(householdId, budget.UserId, cancellationToken));
    }

    private async Task<Result> RestoreTagAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var tagId = new TagId(entry.EntityId);
        var tag = await db.Tags
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tagId && t.UserId == currentUser.Id, cancellationToken);
        if (tag is null)
        {
            return Gone;
        }

        if (!tag.IsDeleted)
        {
            return Result.Success();
        }

        var pattern = LikePattern.Exactly(tag.Name);
        var nameTaken = await db.Tags
            .IgnoreQueryFilters()
            .AnyAsync(
                t => !t.IsDeleted
                    && t.UserId == tag.UserId
                    && t.Id != tagId
                    && EF.Functions.ILike(t.Name, pattern, LikePattern.Escape),
                cancellationToken);
        if (nameTaken)
        {
            return new DomainError(
                ErrorCodes.RestoreNameTaken,
                $"You already have another tag named \"{tag.Name}\". Rename or delete it first.");
        }

        await db.Entry(entry).Collection(e => e.Changes).LoadAsync(cancellationToken);
        var remembered = entry.Remembered(DeletionChangeKind.TransactionTag)
            .Select(id => new TransactionId(id))
            .ToList();
        var stored = await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => remembered.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var present = await db.TransactionTags
            .Where(x => x.TagId == tagId && remembered.Contains(x.TransactionId))
            .Select(x => x.TransactionId)
            .ToListAsync(cancellationToken);

        tag.IsDeleted = false;
        db.TransactionTags.AddRange(
            stored.Except(present).Select(transactionId => new TransactionTag { TransactionId = transactionId, TagId = tagId }));

        return Result.Success();
    }

    private async Task<Result> RestoreRuleAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var ruleId = new CategorizationRuleId(entry.EntityId);
        var rule = await db.CategorizationRules
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == ruleId && r.UserId == currentUser.Id, cancellationToken);
        if (rule is null)
        {
            return Gone;
        }

        if (!rule.IsDeleted)
        {
            return Result.Success();
        }

        var rules = await db.CategorizationRules
            .OrderBy(r => r.Position)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        if (rules.Count >= RuleLimits.MaxRulesPerUser)
        {
            return new DomainError(
                ErrorCodes.CollectionInvalidSize,
                $"You already have {RuleLimits.MaxRulesPerUser} rules. Delete one before restoring this one.");
        }

        await db.Entry(entry).Collection(e => e.Changes).LoadAsync(cancellationToken);
        var remembered = entry.Remembered(DeletionChangeKind.RuleTag).Select(id => new TagId(id)).ToList();
        var tags = await db.Tags
            .IgnoreQueryFilters()
            .Where(t => remembered.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        rule.IsDeleted = false;
        rules.Insert(Math.Clamp(rule.Position, 0, rules.Count), rule);
        for (var index = 0; index < rules.Count; index++)
        {
            rules[index].Position = index;
        }

        db.CategorizationRuleTags.AddRange(tags.Select(tagId => new CategorizationRuleTag { RuleId = ruleId, TagId = tagId }));

        return Result.Success();
    }

    private async Task<Result> RestoreHouseholdAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        var householdId = new HouseholdId(entry.EntityId);
        var household = await db.Households
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
        if (household is null)
        {
            return Gone;
        }

        var memberships = await db.HouseholdMemberships
            .IgnoreQueryFilters()
            .Where(m => m.HouseholdId == householdId && !m.IsDeleted)
            .ToListAsync(cancellationToken);
        if (!memberships.Any(m => m.UserId == currentUser.Id && m.Role == HouseholdRole.Owner))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only an owner of this household can restore it.");
        }

        if (!household.IsDeleted)
        {
            return Result.Success();
        }

        await db.Entry(entry).Collection(e => e.Changes).LoadAsync(cancellationToken);
        var members = memberships.Select(m => m.UserId).ToList();
        var now = clock.UtcNow;
        HouseholdId? sharedInto = householdId;
        household.IsDeleted = false;

        var accountIds = entry.Remembered(DeletionChangeKind.AccountShare).Select(id => new AccountId(id)).ToList();
        await db.Accounts
            .IgnoreQueryFilters()
            .Where(a => accountIds.Contains(a.Id)
                && a.Scope == Scope.Personal
                && a.HouseholdId == null
                && members.Contains(a.UserId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(a => a.Scope, Scope.Shared)
                    .SetProperty(a => a.HouseholdId, sharedInto)
                    .SetProperty(a => a.UpdatedAt, a => a.IsDeleted ? a.UpdatedAt : now),
                cancellationToken);

        var categoryIds = entry.Remembered(DeletionChangeKind.CategoryShare).Select(id => new CategoryId(id)).ToList();
        await db.Categories
            .IgnoreQueryFilters()
            .Where(c => categoryIds.Contains(c.Id)
                && c.Scope == Scope.Personal
                && c.HouseholdId == null
                && members.Contains(c.UserId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(c => c.Scope, Scope.Shared)
                    .SetProperty(c => c.HouseholdId, sharedInto)
                    .SetProperty(c => c.UpdatedAt, c => c.IsDeleted ? c.UpdatedAt : now),
                cancellationToken);

        var tagIds = entry.Remembered(DeletionChangeKind.TagShare).Select(id => new TagId(id)).ToList();
        await db.Tags
            .IgnoreQueryFilters()
            .Where(t => tagIds.Contains(t.Id)
                && t.Scope == Scope.Personal
                && t.HouseholdId == null
                && members.Contains(t.UserId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(t => t.Scope, Scope.Shared)
                    .SetProperty(t => t.HouseholdId, sharedInto)
                    .SetProperty(t => t.UpdatedAt, t => t.IsDeleted ? t.UpdatedAt : now),
                cancellationToken);

        return Result.Success();
    }

    private Task<bool> IsLiveMemberAsync(HouseholdId householdId, Guid userId, CancellationToken cancellationToken) =>
        db.HouseholdMemberships
            .IgnoreQueryFilters()
            .AnyAsync(
                m => m.HouseholdId == householdId
                    && m.UserId == userId
                    && !m.IsDeleted
                    && db.Households.IgnoreQueryFilters().Any(h => h.Id == householdId && !h.IsDeleted),
                cancellationToken);

    private Task<bool> AccountVisibleAsync(AccountId accountId, CancellationToken cancellationToken) =>
        db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken);

    private Task<bool> CategoryLivesAsync(CategoryId categoryId, CancellationToken cancellationToken) =>
        db.Categories
            .IgnoreQueryFilters()
            .AnyAsync(c => c.Id == categoryId && !c.IsDeleted, cancellationToken);
}
