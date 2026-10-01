using JxFinance.Common.Json;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.SaveAllocationTargets;

public sealed record SaveAllocationTargetsRequest(AllocationDimension Dimension, IReadOnlyList<AllocationTargetInput> Targets);

public sealed record AllocationTargetInput(string Key, [property: Quantity] decimal Share);
