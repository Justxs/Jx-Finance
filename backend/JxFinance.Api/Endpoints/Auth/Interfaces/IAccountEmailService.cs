using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.Interfaces;

public interface IAccountEmailService
{
    Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken);

    Task<Result> ResetPasswordAsync(string email, string token, string newPassword, CancellationToken cancellationToken);

    Task<Result> SendVerificationAsync(Guid userId, CancellationToken cancellationToken);

    Task<Result> ConfirmEmailAsync(string email, string token, CancellationToken cancellationToken);
}
