namespace JxFinance.Endpoints.Investments.Shared;

public sealed record BrokerConnectionResponse(
    Guid AccountId,
    Guid? FundingAccountId,
    string QueryId,
    bool IsEnabled,
    DateTimeOffset? LastSyncAt,
    string? LastError);
