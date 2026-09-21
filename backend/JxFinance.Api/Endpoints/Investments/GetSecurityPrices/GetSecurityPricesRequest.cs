namespace JxFinance.Endpoints.Investments.GetSecurityPrices;

public sealed class GetSecurityPricesRequest
{
    public Guid Id { get; init; }

    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }
}
