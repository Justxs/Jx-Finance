namespace JxFinance.Endpoints.Investments.GetValueHistory;

public sealed class GetValueHistoryRequest
{
    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public Guid? AccountId { get; init; }
}
