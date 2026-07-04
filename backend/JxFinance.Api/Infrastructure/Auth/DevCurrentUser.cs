using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Auth;

public sealed class DevCurrentUser : ICurrentUser
{
    public static readonly Guid DevUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public Guid Id => DevUserId;
}
