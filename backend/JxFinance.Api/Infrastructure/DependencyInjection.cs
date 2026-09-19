using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Pdf;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        PdfFontResolver.Register();

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddOptions<AppOptions>()
            .Bind(configuration.GetSection(AppOptions.SectionName))
            .Validate(options => IsValidTimeZone(options.TimeZone), "App:TimeZone is not a valid time zone id.")
            .ValidateOnStart();

        services.AddSingleton<IClock, JxFinance.Infrastructure.Time.SystemClock>();
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
            .AddDefaultTokenProviders();

        var keyDirectory = configuration["App:DataProtectionDirectory"];
        var protection = services.AddDataProtection().SetApplicationName("JxFinance");
        if (!string.IsNullOrWhiteSpace(keyDirectory))
            protection.PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

        services.AddJwtCookieAuthentication(configuration);

        services.AddAuthorizationBuilder();

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
