namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastRequest
{
    public int Days { get; init; } = 90;

    public Guid? WhatIfAccountId { get; init; }

    public decimal? WhatIfAmount { get; init; }

    public DateOnly? WhatIfDate { get; init; }

    public ForecastWhatIf? WhatIf =>
        WhatIfAccountId is { } accountId && WhatIfAmount is { } amount && WhatIfDate is { } date
            ? new ForecastWhatIf(accountId, amount, date)
            : null;
}
