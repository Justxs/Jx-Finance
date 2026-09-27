namespace JxFinance.Endpoints.NetWorth.GetAssetValueHistory;

public sealed class GetAssetValueHistoryRequest
{
    public Guid Id { get; init; }

    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }
}
