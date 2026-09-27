using JxFinance.Common.Json;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record DepreciationInput(
    DateOnly? StartDate,
    [property: Money] decimal? StartValue,
    int? LifeMonths,
    [property: Money] decimal? ResidualValue);
