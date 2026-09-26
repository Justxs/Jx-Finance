using JxFinance.Common.Settings;
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

        var connectionString = configuration.DefaultConnectionString();

        services.AddOptions<AppOptions>()
            .Bind(configuration.GetSection(AppOptions.SectionName))
            .Validate(options => InstanceSettingsSnapshot.IsValidTimeZone(options.TimeZone), "App:TimeZone is not a valid time zone id.")
            .Validate(options => options.BackupMaxDecompressedBytes > 0, "App:BackupMaxDecompressedBytes must be positive.")
            .Validate(options => options.BackupLockTimeoutSeconds > 0, "App:BackupLockTimeoutSeconds must be positive.")
            .ValidateOnStart();

        services.AddSingleton<IClock, Time.SystemClock>();
        services.AddSingleton<Backups.BackupStore>();
        services.AddSingleton<Attachments.AttachmentStore>();
        services.AddSingleton<Common.Email.IEmailTransport, Email.MailKitEmailTransport>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Tokens.EmailConfirmationTokenProvider = EmailConfirmationTokenProviderOptions.ProviderName;
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders()
            .AddTokenProvider<EmailConfirmationTokenProvider>(EmailConfirmationTokenProviderOptions.ProviderName);

        var passwordResetMinutes = configuration.GetValue(
            $"{AppOptions.SectionName}:Email:PasswordResetMinutes",
            new EmailOptions().PasswordResetMinutes);
        services.Configure<DataProtectionTokenProviderOptions>(
            tokens => tokens.TokenLifespan = TimeSpan.FromMinutes(Math.Max(passwordResetMinutes, 1)));

        var keyDirectory = configuration[ConfigKeys.DataProtectionDirectory];
        var protection = services.AddDataProtection().SetApplicationName("JxFinance");
        if (!string.IsNullOrWhiteSpace(keyDirectory))
            protection.PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

        services.AddJwtCookieAuthentication(configuration);

        services.AddAuthorizationBuilder();

        return services;
    }
}
