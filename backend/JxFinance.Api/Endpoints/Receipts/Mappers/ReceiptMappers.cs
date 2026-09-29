using JxFinance.Domain.Receipts;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Receipts.Shared;

namespace JxFinance.Endpoints.Receipts.Mappers;

public static class ReceiptMappers
{
    public static ReceiptResultResponse ToResponse(this ReceiptResult result) => new(
        result.Merchant,
        result.Date,
        result.Currency,
        result.Total,
        result.IsReturn,
        result.PagesRead,
        result.PageCount,
        [.. result.Items.Select(i => new ReceiptItemResponse(i.Name, i.Quantity, i.Amount, i.Discount, i.Deposit, i.CategoryId, i.Remembered))],
        [.. result.Adjustments.Select(a => new ReceiptAdjustmentResponse(a.Kind, a.Label, a.Amount))],
        result.UnreadLines ?? []);

    public static ReceiptCandidateResponse ToCandidate(this Transaction transaction) => new(
        transaction.Id.Value,
        transaction.AccountId.Value,
        transaction.Date,
        transaction.Description,
        transaction.Amount.Amount,
        transaction.Amount.Currency);
}
