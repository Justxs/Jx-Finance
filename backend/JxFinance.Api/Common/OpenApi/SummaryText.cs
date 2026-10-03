using System.Linq.Expressions;
using FastEndpoints;

namespace JxFinance.Common.OpenApi;

public static class SummaryText
{
    public const string ValidationFailed = "Validation failed.";
    public const string PositiveMoney = "Decimal string with at most two decimal places, greater than zero.";
    public const string FlowType = "Income or Expense.";
    public const string Page = "One-based page number. Defaults to 1.";
    public const string PageSize = "Rows per page. Defaults to 20.";
    public const string ReadVersion = "The version of the record you read. Any later change to the record gives it a new version.";
    public const string StaleSettings = "Someone else, or the Telegram outbox following a group that became a supergroup, changed the stored settings while this change was being saved (conflict.stale); nothing was saved. Read them again and resend.";
    public const string StaleVersion = "Someone changed the record after you read it (conflict.stale). Read it again and resend with the new version.";

    public static void DescribePaging<TRequest>(this EndpointSummary<TRequest> summary)
        where TRequest : IPagedRequest
    {
        summary.Describe(nameof(IPagedRequest.Page), Page);
        summary.Describe(nameof(IPagedRequest.PageSize), PageSize);
    }

    public static void Describe<TRequest>(this EndpointSummary<TRequest> summary, string propertyName, string description)
        where TRequest : notnull
    {
        var request = Expression.Parameter(typeof(TRequest), "r");
        var property = Expression.Convert(Expression.Property(request, propertyName), typeof(object));
        summary.RequestParam(Expression.Lambda<Func<TRequest, object?>>(property, request), description);
    }
}
