using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.CreateInvestmentTransaction;
using JxFinance.Endpoints.Investments.GetInvestmentTransactions;
using JxFinance.Endpoints.Investments.GetPortfolio;
using JxFinance.Endpoints.Investments.GetSecurities;
using JxFinance.Endpoints.Investments.SaveSecurity;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface IInvestmentService
{
    Task<PortfolioResponse> GetPortfolioAsync(GetPortfolioRequest request, CancellationToken cancellationToken);

    Task<PagedResponse<InvestmentTransactionResponse>> GetTransactionsAsync(
        GetInvestmentTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<InvestmentTransactionResponse>> CreateTransactionAsync(
        CreateInvestmentTransactionRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteTransactionAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<SecurityResponse>> GetSecuritiesAsync(GetSecuritiesRequest request, CancellationToken cancellationToken);

    Task<Result<SecurityResponse>> SaveSecurityAsync(SaveSecurityRequest request, CancellationToken cancellationToken);
}
