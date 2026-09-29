using JxFinance.Domain.Common;

namespace JxFinance.Common;

public sealed record DatedFlow(DateOnly Date, FlowType Type, decimal Amount);
