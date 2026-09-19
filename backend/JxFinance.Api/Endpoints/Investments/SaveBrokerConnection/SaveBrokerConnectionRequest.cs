namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed record SaveBrokerConnectionRequest(
    string QueryId,
    string? Token = null,
    Guid? FundingAccountId = null,
    bool IsEnabled = true)
{
    public Guid AccountId { get; init; }
}
