using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountBalance(IReadOnlyList<Money> ByCurrency, Money Total,
    Money Reporting,
    Money Holdings,
    decimal StartingReporting,
    bool IsComplete);
