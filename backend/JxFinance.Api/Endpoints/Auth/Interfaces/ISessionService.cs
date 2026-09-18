using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Interfaces;

public interface ISessionService
{
    Task SignInAsync(AppUser user, bool rememberMe, CancellationToken cancellationToken);

    Task<bool> RefreshAsync(CancellationToken cancellationToken);

    Task RenewAsync(AppUser user, CancellationToken cancellationToken);

    Task SignOutAsync(CancellationToken cancellationToken);
}
