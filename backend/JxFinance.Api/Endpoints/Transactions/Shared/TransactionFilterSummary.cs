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
        summary.Describe(nameof(TransactionFilterRequest.Search), "Case-insensitive match against the description.");
        summary.Describe(nameof(TransactionFilterRequest.DateFrom), dateFrom);
        summary.Describe(nameof(TransactionFilterRequest.DateTo), dateTo);
    }
}
