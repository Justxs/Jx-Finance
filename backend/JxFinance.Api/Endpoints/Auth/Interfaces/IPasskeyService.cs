using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Login;
using JxFinance.Endpoints.Auth.Passkeys;

namespace JxFinance.Endpoints.Auth.Interfaces;

public interface IPasskeyService
{
    Task<Result<PasskeyOptionsResponse>> BeginRegistrationAsync(string password, CancellationToken cancellationToken);

    Task<Result<PasskeyResponse>> AddAsync(AddPasskeyRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<PasskeyResponse>> ListAsync(CancellationToken cancellationToken);

    Task<Result<PasskeyResponse>> RenameAsync(RenamePasskeyRequest request, CancellationToken cancellationToken);

    Task<Result> RemoveAsync(string id, CancellationToken cancellationToken);

    Task<Result<PasskeyOptionsResponse>> BeginSignInAsync();

    Task<Result<LoginResponse>> SignInAsync(PasskeySignInRequest request, CancellationToken cancellationToken);
}
