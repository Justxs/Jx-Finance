using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Tokens;

namespace JxFinance.Endpoints.Auth.Interfaces;

public interface IPersonalApiTokenService
{
    Task<IReadOnlyList<PersonalApiTokenResponse>> ListAsync(CancellationToken cancellationToken);

    Task<Result<CreatedPersonalApiTokenResponse>> CreateAsync(
        CreatePersonalApiTokenRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> RevokeAsync(Guid id, CancellationToken cancellationToken);
}
