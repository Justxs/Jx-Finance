using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace JxFinance.Infrastructure.Auth;

public sealed class EmailConfirmationTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public const string ProviderName = "JxEmailConfirmation";

    public EmailConfirmationTokenProviderOptions()
    {
        Name = ProviderName;
        TokenLifespan = TimeSpan.FromDays(1);
    }
}

public sealed class EmailConfirmationTokenProvider(
    IDataProtectionProvider dataProtectionProvider,
    IOptions<EmailConfirmationTokenProviderOptions> options,
    ILogger<DataProtectorTokenProvider<AppUser>> logger)
    : DataProtectorTokenProvider<AppUser>(dataProtectionProvider, options, logger);
