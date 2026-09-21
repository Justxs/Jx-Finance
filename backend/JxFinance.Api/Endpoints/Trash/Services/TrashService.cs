using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Holdings;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
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
            _ => Result.Failure(Gone),
        };
        if (restored.IsFailure)
        {
            return restored;
        }

        entry.RestoredAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

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

    private Task<bool> AccountVisibleAsync(AccountId accountId, CancellationToken cancellationToken) =>
        db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken);

    private Task<bool> CategoryLivesAsync(CategoryId categoryId, CancellationToken cancellationToken) =>
        db.Categories
            .IgnoreQueryFilters()
            .AnyAsync(c => c.Id == categoryId && !c.IsDeleted, cancellationToken);
}
