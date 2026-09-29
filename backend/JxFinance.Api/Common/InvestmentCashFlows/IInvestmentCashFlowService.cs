namespace JxFinance.Common.InvestmentCashFlows;

public interface IInvestmentCashFlowService
{
    Task<IReadOnlyList<DatedFlow>> GetFlowsAsync(
        DateWindow window,
        DateWindow? comparison,
        CancellationToken cancellationToken);
}
