namespace JxFinance.Endpoints.Investments.GetTaxSummary;

public sealed class GetTaxSummaryRequest
{
    public int? Year { get; init; }

    public string? AccountIds { get; init; }
}
