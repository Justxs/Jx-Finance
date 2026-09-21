using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.DeleteSecurityPrice;
using JxFinance.Endpoints.Investments.GetSecurityPrices;
using JxFinance.Endpoints.Investments.GetValueHistory;
using JxFinance.Endpoints.Investments.SetSecurityPrice;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface ISecurityPriceService
{
    Task<Result<SecurityResponse>> SetPriceAsync(
        SetSecurityPriceRequest request,
        bool isAdministrator,
        CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<SecurityPriceResponse>>> GetPricesAsync(
        GetSecurityPricesRequest request,
        CancellationToken cancellationToken);

    Task<Result> DeletePriceAsync(
        DeleteSecurityPriceRequest request,
        bool isAdministrator,
        CancellationToken cancellationToken);

    Task<ValueHistoryResponse> GetValueHistoryAsync(GetValueHistoryRequest request, CancellationToken cancellationToken);
}
