using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record PositionMismatchResponse(
    string Symbol,
    [property: Quantity] decimal BrokerQuantity,
    [property: Quantity] decimal ReplayedQuantity);
