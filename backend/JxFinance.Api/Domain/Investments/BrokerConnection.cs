using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public sealed class BrokerConnection : OwnableEntity
{
    public BrokerConnectionId Id { get; set; } = BrokerConnectionId.New();
    public AccountId AccountId { get; set; }
    public AccountId? FundingAccountId { get; set; }
    public string QueryId { get; set; } = string.Empty;
    public string ProtectedToken { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset? LastSyncAt { get; set; }
    public string? LastError { get; set; }
}
