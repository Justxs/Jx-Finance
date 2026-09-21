using JxFinance.Endpoints.Investments.GetTaxSummary;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface ITaxSummaryService
{
    Task<TaxSummaryResponse> GetAsync(GetTaxSummaryRequest request, CancellationToken cancellationToken);
}
