using System.Collections.Frozen;
using JxFinance.Common.Settings;
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
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

public static class TrashRestorers
{
    private static readonly Task<Result> Unchecked = Task.FromResult(Result.Success());

    public static FrozenDictionary<TrashKind, TrashRestorer> All { get; } = new Dictionary<TrashKind, TrashRestorer>
    {
        [TrashKind.Transaction] = Stored<Transaction, TransactionId>(
            null,
            (db, id) => db.Transactions.Where(t => t.Id == id),
            check: (r, t) => LedgerRestores.AccountOfAsync(r, t.AccountId),
            restore: LedgerRestores.RestoreTransactionAsync),
        [TrashKind.Transfer] = Stored<Transfer, TransferId>(
            null,
            (db, id) => db.Transfers.Where(t => t.Id == id),
            check: LedgerRestores.CheckTransferAsync),
        [TrashKind.Conversion] = Stored<CurrencyConversion, CurrencyConversionId>(
            Feature.MultiCurrency,
            (db, id) => db.CurrencyConversions.Where(c => c.Id == id),
            check: (r, c) => LedgerRestores.AccountOfAsync(r, c.AccountId),
            restore: LedgerRestores.RestoreConversionAsync),
        [TrashKind.Budget] = Owned<Budget, BudgetId>(
            Feature.Budgets,
            (db, id) => db.Budgets.Where(b => b.Id == id),
            restore: CategoryAndTagRestores.RestoreBudgetAsync),
        [TrashKind.Goal] = Owned<Goal, GoalId>(Feature.Goals, (db, id) => db.Goals.Where(g => g.Id == id)),
        [TrashKind.Asset] = Owned<Asset, AssetId>(Feature.NetWorth, (db, id) => db.Assets.Where(a => a.Id == id)),
        [TrashKind.Debt] = Owned<Debt, DebtId>(Feature.NetWorth, (db, id) => db.Debts.Where(d => d.Id == id)),
        [TrashKind.RecurringBill] = Owned<RecurringBill, RecurringBillId>(
            Feature.RecurringBills,
            (db, id) => db.RecurringBills.Where(b => b.Id == id),
            restore: LedgerRestores.RestoreRecurringBillAsync),
        [TrashKind.InvestmentTransaction] = Stored<InvestmentTransaction, InvestmentTransactionId>(
            Feature.Investments,
            (db, id) => db.InvestmentTransactions.Where(t => t.Id == id),
            check: (r, t) => LedgerRestores.AccountOfAsync(r, t.AccountId),
            restore: LedgerRestores.RestoreInvestmentTransactionAsync),
        [TrashKind.Category] = Owned<Category, CategoryId>(
            null,
            (db, id) => db.Categories.Where(c => c.Id == id),
            restore: CategoryAndTagRestores.RestoreCategoryAsync,
            usesChanges: true),
        [TrashKind.Tag] = Owned<Tag, TagId>(
            null,
            (db, id) => db.Tags.Where(t => t.Id == id),
            restore: CategoryAndTagRestores.RestoreTagAsync,
            usesChanges: true),
        [TrashKind.CategorizationRule] = Owned<CategorizationRule, CategorizationRuleId>(
            Feature.CategorizationRules,
            (db, id) => db.CategorizationRules.Where(r => r.Id == id),
            restore: CategoryAndTagRestores.RestoreRuleAsync,
            usesChanges: true),
        [TrashKind.Household] = Stored<Household, HouseholdId>(
            Feature.Households,
            (db, id) => db.Households.Where(h => h.Id == id),
            check: HouseholdRestores.CheckHouseholdOwnerAsync,
            restore: HouseholdRestores.RestoreHouseholdAsync,
            usesChanges: true),
        [TrashKind.Attachment] = Stored<TransactionAttachment, TransactionAttachmentId>(
            Feature.Attachments,
            (db, id) => db.TransactionAttachments.Where(a => a.Id == id),
            check: LedgerRestores.CheckAttachmentTransactionAsync,
            restore: LedgerRestores.RestoreAttachmentAsync),
        [TrashKind.CsvImportMapping] = Owned<CsvImportMapping, CsvImportMappingId>(
            Feature.Import,
            (db, id) => db.CsvImportMappings.Where(m => m.Id == id)),
        [TrashKind.SharedExpense] = Owned<SharedExpense, SharedExpenseId>(
            Feature.Households,
            (db, id) => db.SharedExpenses.Where(e => e.Id == id),
            check: (r, e) => HouseholdRestores.MemberOfAsync(r, e.HouseholdId),
            restore: (r, e) => HouseholdRestores.RestoreSplitAsync(r, e.TransactionId, e.Id.Value)),
        [TrashKind.Settlement] = Stored<Settlement, SettlementId>(
            Feature.Households,
            (db, id) => db.Settlements.Where(s => s.Id == id),
            check: (r, s) => HouseholdRestores.MemberOfAsync(r, s.HouseholdId),
            restore: HouseholdRestores.RestoreSettlementAsync),
        [TrashKind.TransactionGroup] = Owned<TransactionGroup, TransactionGroupId>(
            null,
            (db, id) => db.TransactionGroups.Where(g => g.Id == id),
            restore: CategoryAndTagRestores.RestoreTransactionGroupAsync,
            usesChanges: true),
        [TrashKind.Contact] = Owned<Contact, ContactId>(Feature.People, (db, id) => db.Contacts.Where(c => c.Id == id)),
        [TrashKind.ContactSplit] = Owned<ContactSplit, ContactSplitId>(
            Feature.People,
            (db, id) => db.ContactSplits.Where(s => s.Id == id),
            restore: (r, s) => HouseholdRestores.RestoreSplitAsync(r, s.TransactionId, s.Id.Value)),
        [TrashKind.ContactPayment] = Owned<ContactPayment, ContactPaymentId>(
            Feature.People,
            (db, id) => db.ContactPayments.Where(p => p.Id == id),
            check: HouseholdRestores.CheckContactAsync),
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
}
