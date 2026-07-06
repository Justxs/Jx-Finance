using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Time;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddOptions<AppOptions>()
            .Bind(configuration.GetSection(AppOptions.SectionName))
            .Validate(options => IsValidTimeZone(options.TimeZone), "App:TimeZone is not a valid time zone id.")
            .ValidateOnStart();

        services.AddSingleton<IClock, SystemClock>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        services.AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddIdentityCookies();

        services.AddAuthorizationBuilder();

        services.ConfigureApplicationCookie(options =>
        {
            options.ExpireTimeSpan = TimeSpan.FromDays(1);
            options.SlidingExpiration = false;
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        return services;
    }

    private static bool IsValidTimeZone(string id)
    {
        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(id);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }
}
