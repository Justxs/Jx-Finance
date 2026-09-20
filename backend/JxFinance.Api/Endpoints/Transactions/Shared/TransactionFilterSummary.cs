using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.Shared;

public static class TransactionFilterSummary
{
    public const string Category = "Keep only transactions in this category.";
    public const string CategoryWithSplitLines = "Keep only transactions in this category, including split lines filed under it.";
    public const string DateFrom = "Inclusive start date as YYYY-MM-DD.";
    public const string DateTo = "Inclusive end date as YYYY-MM-DD.";

    public static void DescribeTransactionFilter<TRequest>(
        this EndpointSummary<TRequest> summary,
        string category = CategoryWithSplitLines,
        string dateFrom = DateFrom,
        string dateTo = DateTo)
        where TRequest : ITransactionFilter
    {
        summary.Describe(nameof(ITransactionFilter.AccountId), "Keep only transactions on this account.");
        summary.Describe(nameof(ITransactionFilter.CategoryId), category);
        summary.Describe(nameof(ITransactionFilter.Type), SummaryText.FlowType);
        summary.Describe(nameof(ITransactionFilter.Search), "Case-insensitive match against the description.");
        summary.Describe(nameof(ITransactionFilter.DateFrom), dateFrom);
        summary.Describe(nameof(ITransactionFilter.DateTo), dateTo);
    }
}
