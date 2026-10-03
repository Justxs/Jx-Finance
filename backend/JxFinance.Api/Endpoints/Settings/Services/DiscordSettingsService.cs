using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateDiscordSettings;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<IDiscordSettingsService>(LifeTime.Scoped)]
public sealed class DiscordSettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IAuthService authService,
    IDataProtectionProvider protection,
    IDiscordWebhookClient discord,
    IClock clock) : IDiscordSettingsService
{
    public async Task<DiscordSettingsResponse> GetDiscordAsync(CancellationToken cancellationToken)
    {
        var settings = await StoredSettings.ReadAsync(db, store, cancellationToken);
        var hasWebhook = settings.DiscordProtectedUrl.Length > 0;
        return new DiscordSettingsResponse(
            settings.DiscordEnabled,
            hasWebhook,
            settings.DiscordLastDeliveredAt,
            settings.DiscordLastError,
            settings.DiscordDisabledByDiscordAt is not null,
            hasWebhook && DiscordWebhookSecret.Read(protection, settings.DiscordProtectedUrl).IsFailure);
    }

    public async Task<Result<DiscordSettingsResponse>> UpdateDiscordAsync(
        UpdateDiscordSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var url = OptionalText.Normalize(request.WebhookUrl);
        var failed = await StoredSettings.UpdateAsync(
            db,
            store,
            settings =>
            {
                if (request.Enabled && url is null && settings.DiscordProtectedUrl.Length == 0)
                {
                    return Task.FromResult<DomainError?>(new DomainError(
                        ErrorCodes.DiscordInvalidWebhook,
                        "Paste the webhook URL Discord gave you; it starts with https://discord.com/api/webhooks/."));
                }

                if (url is not null)
                {
                    settings.DiscordProtectedUrl = DiscordWebhookSecret.Protect(protection, url);
                    settings.DiscordDisabledByDiscordAt = null;
                    settings.DiscordLastError = null;
                }

                settings.DiscordEnabled = request.Enabled;
                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);
        return failed is null ? await GetDiscordAsync(cancellationToken) : failed;
    }

    public async Task<Result> SendTestDiscordAsync(CancellationToken cancellationToken)
    {
        var stored = await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken);
        if (stored is not { DiscordProtectedUrl.Length: > 0 })
        {
            return EntityLookup.NotFound("No Discord webhook is saved.");
        }

        var target = DiscordWebhookSecret.Read(protection, stored.DiscordProtectedUrl);
        if (!target.TryGetValue(out var destination))
        {
            return target.Error;
        }

        var settings = store.Current;
        var product = EmailTexts.Product(settings.InstanceName);
        var language = (await authService.CurrentAsync(cancellationToken))?.Language ?? settings.DefaultLanguage;
        var sent = await discord.SendAsync(
            destination,
            new DiscordPost(NotificationTexts.DiscordTest(language, product), DiscordText.Username(product)),
            cancellationToken);

        stored.RecordDiscordSend(clock.UtcNow, sent.Error?.Message, sent.Error?.Code == ErrorCodes.DiscordWebhookGone);
        await db.SaveChangesAsync(cancellationToken);
        return sent.IsSuccess ? Result.Success() : sent.Error!;
    }
}
