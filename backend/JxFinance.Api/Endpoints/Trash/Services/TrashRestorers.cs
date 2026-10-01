using System.Collections.Frozen;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Common.SettleUp;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Households;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Tags.Shared;
using JxFinance.Endpoints.Transfers.Shared;
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

    private static readonly DomainError TagGone =
        new(ErrorCodes.RestoreReferenceMissing, "The tag this belonged to was deleted, so it cannot come back as it was.");

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

    private static readonly DomainError NotHouseholdMember =
        new(ErrorCodes.HouseholdNotMember, "You are no longer a member of the household this belonged to.");

    private static readonly DomainError SplitTransactionGone =
        new(ErrorCodes.RestoreReferenceMissing, "The transaction this split belonged to is deleted. Restore the transaction first.");

    private static readonly DomainError SplitAgain =
        new(ErrorCodes.SettleUpAlreadySplit, "The transaction has been split again since. Delete that split first.");

    private static readonly DomainError TransferSettledAgain =
        new(ErrorCodes.SettleUpTransferTaken, "The transfer of this payment settles another payment now.");

    private static readonly DomainError ContactGone =
        new(ErrorCodes.RestoreReferenceMissing, "The person this payment was with is deleted. Restore the person first.");

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
        [TrashKind.CsvImportMapping] = Owned<CsvImportMapping, CsvImportMappingId>(
            Feature.Import,
            (db, id) => db.CsvImportMappings.Where(m => m.Id == id)),
        [TrashKind.SharedExpense] = Owned<SharedExpense, SharedExpenseId>(
            Feature.Households,
            (db, id) => db.SharedExpenses.Where(e => e.Id == id),
            check: (r, e) => MemberOfAsync(r, e.HouseholdId),
            restore: (r, e) => RestoreSplitAsync(r, e.TransactionId, e.Id.Value)),
        [TrashKind.Settlement] = Stored<Settlement, SettlementId>(
            Feature.Households,
            (db, id) => db.Settlements.Where(s => s.Id == id),
            check: (r, s) => MemberOfAsync(r, s.HouseholdId),
            restore: RestoreSettlementAsync),
        [TrashKind.TransactionGroup] = Owned<TransactionGroup, TransactionGroupId>(
            null,
            (db, id) => db.TransactionGroups.Where(g => g.Id == id),
            restore: RestoreTransactionGroupAsync,
            usesChanges: true),
        [TrashKind.Contact] = Owned<Contact, ContactId>(Feature.Households, (db, id) => db.Contacts.Where(c => c.Id == id)),
        [TrashKind.ContactSplit] = Owned<ContactSplit, ContactSplitId>(
            Feature.Households,
            (db, id) => db.ContactSplits.Where(s => s.Id == id),
            restore: (r, s) => RestoreSplitAsync(r, s.TransactionId, s.Id.Value)),
        [TrashKind.ContactPayment] = Owned<ContactPayment, ContactPaymentId>(
            Feature.Households,
            (db, id) => db.ContactPayments.Where(p => p.Id == id),
            check: CheckContactAsync),
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
        return await r.Db.SeesBothAccountsAsync(transfer, r.CancellationToken) ? Result.Success() : AccountGone;
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
        var targetLives = budget.TagId is { } tagId
            ? await r.TagLivesAsync(tagId)
            : await r.CategoryLivesAsync(budget.CategoryId!.Value);
        if (!targetLives)
        {
            return budget.TagId is null ? CategoryGone : TagGone;
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

        if (bill.DebtId is { } debtId && !await r.Db.Debts.AnyAsync(d => d.Id == debtId, r.CancellationToken))
        {
            bill.DebtId = null;
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

    private static async Task<Result> RestoreTagAsync(TrashRestore r, Tag tag)
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

    private static async Task<Result> RestoreTransactionGroupAsync(TrashRestore r, TransactionGroup group)
    {
        var db = r.Db;
        var ownerId = group.UserId;
        TransactionGroupId? restoredId = group.Id;
        var remembered = r.Entry.Remembered<TransactionId>(DeletionChangeKind.GroupMember);
        await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => remembered.Contains(t.Id)
                && t.UserId == ownerId
                && (t.GroupId == null || !db.TransactionGroups.IgnoreQueryFilters(QueryFilters.OwnerOnly).Any(g => g.Id == t.GroupId)))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, restoredId), r.CancellationToken);

        return Result.Success();
    }

    private static async Task<Result> RestoreRuleAsync(TrashRestore r, CategorizationRule rule)
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

    private static async Task<Result> CheckHouseholdOwnerAsync(TrashRestore r, Household household)
    {
        var householdId = household.Id;
        var isOwner = await r.Db.HouseholdMemberships
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                m => m.HouseholdId == householdId
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
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(m => m.HouseholdId == householdId)
            .Select(m => m.UserId)
            .ToListAsync(r.CancellationToken);
        var now = r.Clock.UtcNow;
        foreach (var set in ShareableSet.All)
        {
            await set.ReshareAsync(db, r.Entry.Remembered(set.ShareKind), members, householdId, now, r.CancellationToken);
        }

        return Result.Success();
    }

    private static async Task<Result> MemberOfAsync(TrashRestore r, HouseholdId householdId) =>
        await r.IsLiveMemberAsync(householdId, r.UserId) ? Result.Success() : NotHouseholdMember;

    private static async Task<Result> RestoreSplitAsync(TrashRestore r, TransactionId transactionId, Guid splitId)
    {
        if (!await r.Db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(t => t.Id == transactionId, r.CancellationToken))
        {
            return SplitTransactionGone;
        }

        return await SplitRules.IsSplitAsync(r.Db, transactionId, splitId, r.CancellationToken) ? SplitAgain : Result.Success();
    }

    private static async Task<Result> CheckContactAsync(TrashRestore r, ContactPayment payment) =>
        await r.Db.Contacts.AnyAsync(c => c.Id == payment.ContactId, r.CancellationToken) ? Result.Success() : ContactGone;

    private static async Task<Result> RestoreSettlementAsync(TrashRestore r, Settlement settlement)
    {
        if (settlement.TransferId is not { } transferId)
        {
            return Result.Success();
        }

        var settledAgain = await r.Db.Settlements
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(s => s.TransferId == transferId && s.Id != settlement.Id, r.CancellationToken);
        return settledAgain ? TransferSettledAgain : Result.Success();
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
