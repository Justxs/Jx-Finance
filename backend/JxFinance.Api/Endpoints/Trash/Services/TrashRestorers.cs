using System.Collections.Frozen;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
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
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

public static class TrashRestorers
{
    private static readonly Task<Result> Unchecked = Task.FromResult(Result.Success());

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

    private static readonly DomainError TransactionGone = new(
        ErrorCodes.RestoreReferenceMissing,
        "The transaction this file belonged to is deleted or no longer visible. Restore the transaction first.");

    private static readonly DomainError AttachmentFileGone = new(
        ErrorCodes.RestoreDetailsLost,
        "The file itself is no longer stored, so there is nothing to bring back.");

    private static readonly DomainError AttachmentSlotsFull = new(
        ErrorCodes.AttachmentLimitReached,
        $"The transaction already has {TransactionAttachment.MaxPerTransaction} files. Remove one first.");

    private static readonly DomainError NotHouseholdOwner =
        new(ErrorCodes.AccessForbidden, "Only an owner of this household can restore it.");

    public static FrozenDictionary<TrashKind, TrashRestorer> All { get; } = new Dictionary<TrashKind, TrashRestorer>
    {
        [TrashKind.Transaction] = Stored<Transaction, TransactionId>(
            null,
            (db, id) => db.Transactions.Where(t => t.Id == id),
            check: (r, t) => AccountOfAsync(r, t.AccountId),
            restore: RestoreTransactionAsync),
        [TrashKind.Transfer] = Stored<Transfer, TransferId>(
            null,
            (db, id) => db.Transfers.Where(t => t.Id == id),
            check: CheckTransferAsync),
        [TrashKind.Conversion] = Stored<CurrencyConversion, CurrencyConversionId>(
            Feature.MultiCurrency,
            (db, id) => db.CurrencyConversions.Where(c => c.Id == id),
            check: (r, c) => AccountOfAsync(r, c.AccountId),
            restore: RestoreConversionAsync),
        [TrashKind.Budget] = Owned<Budget, BudgetId>(
            Feature.Budgets,
            (db, id) => db.Budgets.Where(b => b.Id == id),
            restore: RestoreBudgetAsync),
        [TrashKind.Goal] = Owned<Goal, GoalId>(Feature.Goals, (db, id) => db.Goals.Where(g => g.Id == id)),
        [TrashKind.Asset] = Owned<Asset, AssetId>(Feature.NetWorth, (db, id) => db.Assets.Where(a => a.Id == id)),
        [TrashKind.Debt] = Owned<Debt, DebtId>(Feature.NetWorth, (db, id) => db.Debts.Where(d => d.Id == id)),
        [TrashKind.RecurringBill] = Owned<RecurringBill, RecurringBillId>(
            Feature.RecurringBills,
            (db, id) => db.RecurringBills.Where(b => b.Id == id),
            restore: RestoreRecurringBillAsync),
        [TrashKind.InvestmentTransaction] = Stored<InvestmentTransaction, InvestmentTransactionId>(
            Feature.Investments,
            (db, id) => db.InvestmentTransactions.Where(t => t.Id == id),
            check: (r, t) => AccountOfAsync(r, t.AccountId),
            restore: RestoreInvestmentTransactionAsync),
        [TrashKind.Category] = Owned<Category, CategoryId>(
            null,
            (db, id) => db.Categories.Where(c => c.Id == id),
            restore: RestoreCategoryAsync,
            usesChanges: true),
        [TrashKind.Tag] = Owned<Tag, TagId>(
            null,
            (db, id) => db.Tags.Where(t => t.Id == id),
            restore: RestoreTagAsync,
            usesChanges: true),
        [TrashKind.CategorizationRule] = Owned<CategorizationRule, CategorizationRuleId>(
            Feature.CategorizationRules,
            (db, id) => db.CategorizationRules.Where(r => r.Id == id),
            restore: RestoreRuleAsync,
            usesChanges: true),
        [TrashKind.Household] = Stored<Household, HouseholdId>(
            Feature.Households,
            (db, id) => db.Households.Where(h => h.Id == id),
            check: CheckHouseholdOwnerAsync,
            restore: RestoreHouseholdAsync,
            usesChanges: true),
        [TrashKind.Attachment] = Stored<TransactionAttachment, TransactionAttachmentId>(
            null,
            (db, id) => db.TransactionAttachments.Where(a => a.Id == id),
            check: CheckAttachmentTransactionAsync,
            restore: RestoreAttachmentAsync),
    }.ToFrozenDictionary();

    public static TrashRestorer? Of(TrashKind kind) => All.GetValueOrDefault(kind);

    public static Feature? FeatureOf(TrashKind kind) => Of(kind)?.Feature;

    public static bool IsEnabled(TrashKind kind, InstanceSettingsSnapshot settings) =>
        FeatureOf(kind) is not { } feature || settings.IsEnabled(feature);

    public static IReadOnlyList<TrashKind> Disabled(InstanceSettingsSnapshot settings) =>
        [.. Enum.GetValues<TrashKind>().Where(kind => !IsEnabled(kind, settings))];

    private static TrashRestorer Owned<TEntity, TId>(
        Feature? feature,
        Func<AppDbContext, TId, IQueryable<TEntity>> find,
        Func<TrashRestore, TEntity, Task<Result>>? check = null,
        Func<TrashRestore, TEntity, Task<Result>>? restore = null,
        bool usesChanges = false)
        where TEntity : OwnableEntity
        where TId : struct, IStronglyTypedId<TId> =>
        Kind(
            feature,
            r => find(r.Db, TId.From(r.Entry.EntityId)).Where(e => e.UserId == r.UserId),
            check,
            restore,
            usesChanges);

    private static TrashRestorer Stored<TEntity, TId>(
        Feature? feature,
        Func<AppDbContext, TId, IQueryable<TEntity>> find,
        Func<TrashRestore, TEntity, Task<Result>>? check = null,
        Func<TrashRestore, TEntity, Task<Result>>? restore = null,
        bool usesChanges = false)
        where TEntity : EntityBase
        where TId : struct, IStronglyTypedId<TId> =>
        Kind(feature, r => find(r.Db, TId.From(r.Entry.EntityId)), check, restore, usesChanges);

    private static TrashRestorer Kind<TEntity>(
        Feature? feature,
        Func<TrashRestore, IQueryable<TEntity>> find,
        Func<TrashRestore, TEntity, Task<Result>>? check,
        Func<TrashRestore, TEntity, Task<Result>>? restore,
        bool usesChanges)
        where TEntity : EntityBase =>
        new(
            feature,
            async r => await find(r)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r.CancellationToken),
            (r, entity) => check?.Invoke(r, (TEntity)entity) ?? Unchecked,
            (r, entity) => restore?.Invoke(r, (TEntity)entity) ?? Unchecked,
            usesChanges);

    private static async Task<Result> AccountOfAsync(TrashRestore r, AccountId accountId) =>
        await r.AccountVisibleAsync(accountId) ? Result.Success() : AccountGone;

    private static async Task<Result> RestoreTransactionAsync(TrashRestore r, Transaction transaction)
    {
        if (transaction.CategoryId is { } categoryId && !await r.CategoryLivesAsync(categoryId))
        {
            return CategoryGone;
        }

        var transactionId = transaction.Id;
        if (transaction.IsSplit &&
            !await r.Db.TransactionLines.AnyAsync(l => l.TransactionId == transactionId, r.CancellationToken))
        {
            return LinesGone;
        }

        return Result.Success();
    }

    private static async Task<Result> CheckTransferAsync(TrashRestore r, Transfer transfer)
    {
        var visible = await r.Db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId,
            r.CancellationToken);

        return visible == 2 ? Result.Success() : AccountGone;
    }

    private static async Task<Result> RestoreConversionAsync(TrashRestore r, CurrencyConversion conversion)
    {
        if ((conversion.FeeTransactionId?.Value ?? r.Entry.CompanionId) is not { } feeId)
        {
            return Result.Success();
        }

        var typedFeeId = new TransactionId(feeId);
        var fee = await r.Db.Transactions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == typedFeeId, r.CancellationToken);
        if (fee is null)
        {
            return FeeGone;
        }

        if (fee.IsDeleted)
        {
            if (r.Entry.CompanionId != feeId)
            {
                return FeeDeletedSeparately;
            }

            fee.IsDeleted = false;
        }

        conversion.FeeTransactionId = typedFeeId;

        return Result.Success();
    }

    private static async Task<Result> RestoreBudgetAsync(TrashRestore r, Budget budget)
    {
        if (!await r.CategoryLivesAsync(budget.CategoryId))
        {
            return CategoryGone;
        }

        var taken = await r.Db.Budgets.AnyAsync(
            b => b.CategoryId == budget.CategoryId && b.Period == budget.Period,
            r.CancellationToken);
        if (taken)
        {
            return new DomainError(
                ErrorCodes.RestoreSlotTaken,
                $"That category already has a {budget.Period.ToString().ToLowerInvariant()} budget.");
        }

        return Result.Success();
    }

    private static async Task<Result> RestoreRecurringBillAsync(TrashRestore r, RecurringBill bill)
    {
        if (bill.AccountId is { } accountId && !await r.AccountVisibleAsync(accountId))
        {
            return AccountGone;
        }

        if (bill.ToAccountId is { } toAccountId && !await r.AccountVisibleAsync(toAccountId))
        {
            return AccountGone;
        }

        if (bill.CategoryId is { } categoryId && !await r.CategoryLivesAsync(categoryId))
        {
            return CategoryGone;
        }

        return Result.Success();
    }

    private static async Task<Result> RestoreInvestmentTransactionAsync(TrashRestore r, InvestmentTransaction investment)
    {
        if (investment.SecurityId is not { } securityId)
        {
            return Result.Success();
        }

        var currency = await r.Db.Securities
            .Where(s => s.Id == securityId)
            .Select(s => (Currency?)s.Currency)
            .FirstOrDefaultAsync(r.CancellationToken);
        if (currency is null)
        {
            return SecurityGone;
        }

        if (investment.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell
            && investment.CashAmount.Currency != currency)
        {
            return SecurityChanged;
        }

        var oversold = await r.Ledger.FirstOversoldSaleAsync(
            investment.AccountId,
            securityId,
            history => history.Append(investment),
            r.CancellationToken);
        if (oversold is { } saleId)
        {
            return saleId == investment.Id ? SaleUncovered : LaterSalesDepend;
        }

        return Result.Success();
    }

    private static async Task<Result> RestoreCategoryAsync(TrashRestore r, Category category)
    {
        var db = r.Db;
        var now = r.Clock.UtcNow;
        var categoryId = category.Id;
        CategoryId? restoredId = categoryId;

        var transactionIds = r.Entry.Remembered<TransactionId>(DeletionChangeKind.TransactionCategory);
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => transactionIds.Contains(t.Id) && t.CategoryId == null && !t.IsSplit && t.Type == category.Type)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(t => t.CategoryId, restoredId).SetProperty(t => t.UpdatedAt, now),
                r.CancellationToken);

        var lineIds = r.Entry.Remembered(DeletionChangeKind.LineCategory);
        await db.TransactionLines
            .Where(l => lineIds.Contains(l.Id) && l.CategoryId == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(l => l.CategoryId, restoredId), r.CancellationToken);

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
            if (await BudgetMayReturnAsync(r, budget, category))
            {
                budget.IsDeleted = false;
            }
        }

        return Result.Success();
    }

    private static async Task<bool> BudgetMayReturnAsync(TrashRestore r, Budget budget, Category category)
    {
        var taken = await r.Db.Budgets
            .IgnoreQueryFilters()
            .AnyAsync(
                b => !b.IsDeleted
                    && b.Id != budget.Id
                    && b.UserId == budget.UserId
                    && b.CategoryId == budget.CategoryId
                    && b.Period == budget.Period,
                r.CancellationToken);
        if (taken)
        {
            return false;
        }

        return budget.UserId == category.UserId
            || (category is { Scope: Scope.Shared, HouseholdId: { } householdId }
                && await r.IsLiveMemberAsync(householdId, budget.UserId));
    }

    private static async Task<Result> RestoreTagAsync(TrashRestore r, Tag tag)
    {
        var db = r.Db;
        var tagId = tag.Id;
        var pattern = LikePattern.Exactly(tag.Name);
        var nameTaken = await db.Tags
            .IgnoreQueryFilters()
            .AnyAsync(
                t => !t.IsDeleted
                    && t.UserId == tag.UserId
                    && t.Id != tagId
                    && EF.Functions.ILike(t.Name, pattern, LikePattern.Escape),
                r.CancellationToken);
        if (nameTaken)
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

        return Result.Success();
    }

    private static async Task<Result> RestoreRuleAsync(TrashRestore r, CategorizationRule rule)
    {
        var db = r.Db;
        var rules = await db.CategorizationRules
            .OrderBy(x => x.Position)
            .ThenBy(x => x.CreatedAt)
            .ToListAsync(r.CancellationToken);
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
        for (var index = 0; index < rules.Count; index++)
        {
            rules[index].Position = index;
        }

        var ruleId = rule.Id;
        db.CategorizationRuleTags.AddRange(tags.Select(tagId => new CategorizationRuleTag { RuleId = ruleId, TagId = tagId }));

        return Result.Success();
    }

    private static async Task<Result> CheckHouseholdOwnerAsync(TrashRestore r, Household household)
    {
        var householdId = household.Id;
        var isOwner = await r.Db.HouseholdMemberships
            .IgnoreQueryFilters()
            .AnyAsync(
                m => m.HouseholdId == householdId
                    && !m.IsDeleted
                    && m.UserId == r.UserId
                    && m.Role == HouseholdRole.Owner,
                r.CancellationToken);

        return isOwner ? Result.Success() : NotHouseholdOwner;
    }

    private static async Task<Result> RestoreHouseholdAsync(TrashRestore r, Household household)
    {
        var db = r.Db;
        var householdId = household.Id;
        var members = await db.HouseholdMemberships
            .IgnoreQueryFilters()
            .Where(m => m.HouseholdId == householdId && !m.IsDeleted)
            .Select(m => m.UserId)
            .ToListAsync(r.CancellationToken);
        var now = r.Clock.UtcNow;
        HouseholdId? sharedInto = householdId;

        var accountIds = r.Entry.Remembered<AccountId>(DeletionChangeKind.AccountShare);
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
                r.CancellationToken);

        var categoryIds = r.Entry.Remembered<CategoryId>(DeletionChangeKind.CategoryShare);
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
                r.CancellationToken);

        var tagIds = r.Entry.Remembered<TagId>(DeletionChangeKind.TagShare);
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
                r.CancellationToken);

        return Result.Success();
    }

    private static async Task<Result> CheckAttachmentTransactionAsync(TrashRestore r, TransactionAttachment attachment) =>
        await r.Db.Transactions.AnyAsync(t => t.Id == attachment.TransactionId, r.CancellationToken)
            ? Result.Success()
            : TransactionGone;

    private static async Task<Result> RestoreAttachmentAsync(TrashRestore r, TransactionAttachment attachment)
    {
        if (!r.AttachmentFiles.Exists(r.Entry.EntityId))
        {
            return AttachmentFileGone;
        }

        await r.Db.Database.LockAsync(attachment.TransactionId.Value, r.CancellationToken);
        var count = await r.Db.TransactionAttachments.CountAsync(
            a => a.TransactionId == attachment.TransactionId,
            r.CancellationToken);

        return count >= TransactionAttachment.MaxPerTransaction ? AttachmentSlotsFull : Result.Success();
    }
}
