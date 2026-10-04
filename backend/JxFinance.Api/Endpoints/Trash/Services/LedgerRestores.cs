using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Investments;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Transfers.Shared;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

internal static class LedgerRestores
{
    private static readonly DomainError AccountGone =
        new(ErrorCodes.RestoreReferenceMissing, "The account this belonged to is archived. Restore the account first.");

    internal static readonly DomainError CategoryGone =
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

    internal static async Task<Result> AccountOfAsync(TrashRestore r, AccountId accountId) =>
        await r.AccountVisibleAsync(accountId) ? Result.Success() : AccountGone;

    internal static async Task<Result> RestoreTransactionAsync(TrashRestore r, Transaction transaction)
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

    internal static async Task<Result> CheckTransferAsync(TrashRestore r, Transfer transfer)
    {
        return await r.Db.SeesBothAccountsAsync(transfer, r.CancellationToken) ? Result.Success() : AccountGone;
    }

    internal static async Task<Result> RestoreConversionAsync(TrashRestore r, CurrencyConversion conversion)
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

    internal static async Task<Result> RestoreRecurringBillAsync(TrashRestore r, RecurringBill bill)
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

    internal static async Task<Result> RestoreInvestmentTransactionAsync(TrashRestore r, InvestmentTransaction investment)
    {
        if (investment.SecurityId is not { } securityId)
        {
            return Result.Success();
        }

        var currency = await r.Db.Securities
            .Where(s => s.Id == securityId)
            .Select(s => (Currency?)s.Currency)
            .FirstOrDefaultAsync(r.CancellationToken);
        var relatedCurrency = investment.RelatedSecurityId is { } relatedId
            ? await r.Db.Securities
                .Where(s => s.Id == relatedId)
                .Select(s => (Currency?)s.Currency)
                .FirstOrDefaultAsync(r.CancellationToken)
            : currency;
        if (currency is null || relatedCurrency is null)
        {
            return SecurityGone;
        }

        if ((investment.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell
                && investment.CashAmount.Currency != currency)
            || relatedCurrency != currency)
        {
            return SecurityChanged;
        }

        var oversold = await r.Ledger.NewlyOversoldAsync(
            investment.AccountId,
            history => history.Append(investment),
            r.CancellationToken);
        if (oversold.Count > 0)
        {
            return oversold.Contains(investment.Id) ? SaleUncovered : LaterSalesDepend;
        }

        return Result.Success();
    }

    internal static async Task<Result> CheckAttachmentTransactionAsync(TrashRestore r, TransactionAttachment attachment) =>
        await r.Db.Transactions.AnyAsync(t => t.Id == attachment.TransactionId, r.CancellationToken)
            ? Result.Success()
            : TransactionGone;

    internal static async Task<Result> RestoreAttachmentAsync(TrashRestore r, TransactionAttachment attachment)
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
