using System.Security.Claims;
using FastEndpoints.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Infrastructure.Auth;

public static class JwtCookieAuthentication
{
    public static IServiceCollection AddJwtCookieAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var signingKey = JwtSigningKey.Resolve(configuration);
        services.AddSingleton(signingKey);

        services.AddAuthenticationJwtBearer(
            signing => signing.SigningKey = signingKey.Value,
            bearer =>
            {
                bearer.TokenValidationParameters.ClockSkew = TimeSpan.Zero;
                bearer.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        context.Token = context.Request.Cookies[AuthCookies.AccessToken];
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ValidatePrincipalAsync,
                };
            });

        return services;
    }

    private static async Task ValidatePrincipalAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (!Guid.TryParse(principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) || userId == Guid.Empty)
        {
            context.Fail("The token does not identify a user.");
            return;
        }

        var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<AppUser>>();
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null
            || user.SecurityStamp != principal!.FindFirstValue(AuthClaims.SecurityStamp)
            || await users.IsLockedOutAsync(user))
        {
            context.Fail("The session is no longer valid.");
        }
    }
}
