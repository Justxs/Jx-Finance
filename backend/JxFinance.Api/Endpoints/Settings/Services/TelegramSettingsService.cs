using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Common.Telegram;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateTelegramSettings;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<ITelegramSettingsService>(LifeTime.Scoped)]
public sealed class TelegramSettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IAuthService authService,
    IDataProtectionProvider protection,
    ITelegramBotClient telegram,
    IClock clock) : ITelegramSettingsService
{
    public async Task<TelegramSettingsResponse> GetTelegramAsync(CancellationToken cancellationToken)
    {
        var settings = await StoredSettings.ReadAsync(db, store, cancellationToken);
        var hasToken = settings.TelegramProtectedToken.Length > 0;
        return new TelegramSettingsResponse(
            settings.TelegramEnabled,
            hasToken,
            settings.TelegramChatId,
            settings.TelegramLastDeliveredAt,
            settings.TelegramLastError,
            settings.TelegramDisabledByTelegramAt is not null,
            hasToken && TelegramTokenSecret.Read(protection, settings.TelegramProtectedToken).IsFailure);
    }

    public async Task<Result<TelegramSettingsResponse>> UpdateTelegramAsync(
        UpdateTelegramSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var token = OptionalText.Normalize(request.BotToken);
        var failed = await StoredSettings.UpdateAsync(
            db,
            store,
            settings => Task.FromResult(Apply(settings, request, token)),
            cancellationToken);
        return failed is null ? await GetTelegramAsync(cancellationToken) : failed;
    }

    public async Task<Result> SendTestTelegramAsync(CancellationToken cancellationToken)
    {
        var stored = await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken);
        if (stored is not { TelegramProtectedToken.Length: > 0, TelegramChatId: not null })
        {
            return EntityLookup.NotFound("No Telegram bot token and group are saved.");
        }

        var token = TelegramTokenSecret.Read(protection, stored.TelegramProtectedToken);
        if (!token.TryGetValue(out var botToken))
        {
            return token.Error;
        }

        var settings = store.Current;
        var product = EmailTexts.Product(settings.InstanceName);
        var language = (await authService.CurrentAsync(cancellationToken))?.Language ?? settings.DefaultLanguage;
        var sent = await telegram.SendAsync(stored, botToken, NotificationTexts.TelegramTest(language, product), cancellationToken);

        stored.RecordTelegramSend(clock.UtcNow, sent.Error?.Message, sent.Error?.Code == ErrorCodes.TelegramBotRemoved);
        await db.SaveChangesAsync(cancellationToken);
        return sent.IsSuccess ? Result.Success() : sent.Error!;
    }

    private DomainError? Apply(InstanceSettings settings, UpdateTelegramSettingsRequest request, string? token)
    {
        if (request.Enabled && token is null && settings.TelegramProtectedToken.Length == 0)
        {
            return new DomainError(
                ErrorCodes.TelegramInvalidToken,
                "Paste the token @BotFather gave you; it looks like 123456789:AAE….");
        }

        if (request.Enabled && request.ChatId is null)
        {
            return new DomainError(
                ErrorCodes.TelegramInvalidChat,
                "Enter the id of the Telegram group, a whole number such as -1001234567890.");
        }

        if (token is not null || request.ChatId != settings.TelegramChatId)
        {
            settings.TelegramDisabledByTelegramAt = null;
            settings.TelegramLastError = null;
        }

        if (token is not null)
        {
            settings.TelegramProtectedToken = TelegramTokenSecret.Protect(protection, token);
        }

        settings.TelegramChatId = request.ChatId;
        settings.TelegramEnabled = request.Enabled;
        return null;
    }
}
