using JxFinance.Common.Json;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record AllocationTargetsResponse(
    AllocationDimension? Dimension,
    IReadOnlyList<AllocationTargetResponse> Targets);

public sealed record AllocationTargetResponse(string Key, [property: Quantity] decimal Share, string? Symbol);
