using JxFinance.Domain.Common;

namespace JxFinance.Common.InvestmentCashFlows;

public sealed record InvestmentCashFlow(DateOnly Date, FlowType Type, decimal Amount);
