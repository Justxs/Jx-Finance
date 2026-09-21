namespace JxFinance.Common.InvestmentCashFlows;

public interface IInvestmentCashFlowService
{
    Task<IReadOnlyList<InvestmentCashFlow>> GetFlowsAsync(
        DateWindow window,
        DateWindow? comparison,
        CancellationToken cancellationToken);
}
