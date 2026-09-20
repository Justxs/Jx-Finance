using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Conversions.CreateConversion;
using JxFinance.Endpoints.Conversions.GetConversions;
using JxFinance.Endpoints.Conversions.Shared;
using JxFinance.Endpoints.Conversions.UpdateConversion;

namespace JxFinance.Endpoints.Conversions.Interfaces;

public interface IConversionService
{
    Task<PagedResponse<ConversionResponse>> GetPageAsync(
        GetConversionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<ConversionResponse>> CreateAsync(
        CreateConversionRequest request,
        CancellationToken cancellationToken);

    Task<Result<ConversionResponse>> UpdateAsync(
        UpdateConversionRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
