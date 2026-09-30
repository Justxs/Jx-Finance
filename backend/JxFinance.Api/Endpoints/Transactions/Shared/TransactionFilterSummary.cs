using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Transactions.Shared;

public static class TransactionFilterSummary
{
    public const string Category = "Keep only transactions in this category.";
    public const string CategoryWithSplitLines = "Keep only transactions in this category, including split lines filed under it.";
    public const string DateFrom = "Inclusive start date as YYYY-MM-DD.";
    public const string DateTo = "Inclusive end date as YYYY-MM-DD.";

    public const string Tags = "Comma-separated tag ids, at most ten. A transaction is kept only when it "
        + "carries every one of them, so adding a tag always narrows the list. Tags sit on the transaction, "
        + "never on a split line.";

    public static void DescribeTransactionFilter<TRequest>(
        this EndpointSummary<TRequest> summary,
        string category = CategoryWithSplitLines,
        string dateFrom = DateFrom,
        string dateTo = DateTo)
        where TRequest : TransactionFilterRequest
    {
        summary.Describe(nameof(TransactionFilterRequest.AccountId), "Keep only transactions on this account.");
        summary.Describe(nameof(TransactionFilterRequest.CategoryId), category);
        summary.Describe(nameof(TransactionFilterRequest.TagIds), Tags);
        summary.Describe(nameof(TransactionFilterRequest.Type), SummaryText.FlowType);
        summary.Describe(nameof(TransactionFilterRequest.Search), "Case-insensitive match against the description, the note or your name for the payee.");
        summary.Describe(
            nameof(TransactionFilterRequest.Payee),
            "Keep only transactions whose normalized description equals the normalized value: lowercase words, "
            + "punctuation dropped and tokens with three or more digits dropped. Send a payeeKey from the report's "
            + "expenseByPayee or a raw description. A value with nothing left after normalizing is ignored.");
        summary.Describe(nameof(TransactionFilterRequest.DateFrom), dateFrom);
        summary.Describe(nameof(TransactionFilterRequest.DateTo), dateTo);
        summary.Describe(
            nameof(TransactionFilterRequest.AmountMin),
            "Inclusive lowest amount, compared with the size of the amount in the transaction's own currency, so a refund of 49.00 matches like a purchase of 49.00.");
        summary.Describe(nameof(TransactionFilterRequest.AmountMax), "Inclusive highest amount, compared the same way as amountMin.");
        summary.Describe(
            nameof(TransactionFilterRequest.Unusual),
            "true keeps only expenses flagged as unusual and not marked \"not unusual\". Ignored while the "
            + "unusualAmounts feature is off.");
        summary.Describe(
            nameof(TransactionFilterRequest.Uncategorized),
            "true keeps only transactions without a category, and split transactions with at least one line "
            + "without one.");
    }
}
