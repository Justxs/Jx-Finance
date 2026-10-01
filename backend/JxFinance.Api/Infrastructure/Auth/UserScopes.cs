using JxFinance.Domain.Households;

namespace JxFinance.Infrastructure.Auth;

public static class UserScopes
{
    public static AsyncServiceScope CreateUserScope(
        this IServiceScopeFactory scopes,
        Guid userId,
        HouseholdId? activeHousehold = null)
    {
        var scope = scopes.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<JobUser>().User = new FixedUser(userId, activeHousehold);
        return scope;
    }

    public static AsyncServiceScope CreateUserScope(this IServiceProvider services, Guid userId) =>
        services.GetRequiredService<IServiceScopeFactory>().CreateUserScope(userId);
}
