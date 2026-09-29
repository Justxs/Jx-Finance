using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Notifications;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.Shared;
using JxFinance.Endpoints.Users.UpdateMyDiscord;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Users.Services;

[RegisterService<IDiscordWebhookService>(LifeTime.Scoped)]
public sealed class DiscordWebhookService(
    AppDbContext db,
    ICurrentUser currentUser,
    IDataProtectionProvider protection,
    IDiscordWebhookClient client,
    IInstanceSettingsStore store,
    IClock clock) : IDiscordWebhookService
{
    private static readonly DomainError NoWebhook = EntityLookup.NotFound("No Discord webhook is saved on your profile.");

    public async Task<DiscordWebhookResponse> GetAsync(CancellationToken cancellationToken)
    {
        var webhook = await db.DiscordWebhooks.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == currentUser.Id, cancellationToken);
        if (webhook is null)
        {
            return new DiscordWebhookResponse(false, true, Enum.GetValues<NotificationType>(), null, null, false, false);
        }

        return new DiscordWebhookResponse(
            true,
            webhook.IsEnabled,
            webhook.Types,
            webhook.LastDeliveredAt,
            webhook.LastError,
            webhook.DisabledByDiscordAt is not null,
            DiscordWebhookSecret.Read(protection, webhook.ProtectedUrl).IsFailure);
    }

    public async Task<Result<DiscordWebhookResponse>> UpdateAsync(
        UpdateMyDiscordRequest request,
        CancellationToken cancellationToken)
    {
        var url = OptionalText.Normalize(request.WebhookUrl);
        var webhook = await db.DiscordWebhooks.FirstOrDefaultAsync(w => w.UserId == currentUser.Id, cancellationToken);
        if (webhook is null)
        {
            if (url is null)
            {
                return new DomainError(
                    ErrorCodes.DiscordInvalidWebhook,
                    "Paste the webhook URL Discord gave you; it starts with https://discord.com/api/webhooks/.");
            }

            webhook = new DiscordWebhook();
            db.DiscordWebhooks.Add(webhook);
        }

        if (url is not null)
        {
            webhook.ProtectedUrl = DiscordWebhookSecret.Protect(protection, url);
            webhook.DisabledByDiscordAt = null;
            webhook.LastError = null;
        }

        webhook.IsEnabled = request.IsEnabled;
        webhook.Types = request.Types.Order().ToList();
        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.ConflictBusy, "The webhook was saved from another window just now. Try again."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return await GetAsync(cancellationToken);
    }

    public async Task<Result<Guid>> DeleteAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        var deleted = await db.DeleteOrNotFoundAsync<DiscordWebhook>(
            userId,
            _ => true,
            NoWebhook,
            webhook => webhook.ProtectedUrl = string.Empty,
            cancellationToken);
        if (deleted.IsSuccess)
        {
            await db.DiscordMessages
                .Where(m => m.UserId == userId && m.SentAt == null)
                .ExecuteDeleteAsync(cancellationToken);
        }

        return deleted;
    }

    public async Task<Result> TestAsync(CancellationToken cancellationToken)
    {
        var settings = store.Current;
        if (!settings.DiscordEnabled)
        {
            return new DomainError(
                ErrorCodes.DiscordDisabled,
                "An administrator has not allowed Discord notifications on this installation.");
        }

        if (await db.DiscordWebhooks.FirstOrDefaultAsync(w => w.UserId == currentUser.Id, cancellationToken) is not { } webhook)
        {
            return NoWebhook;
        }

        var target = DiscordWebhookSecret.Read(protection, webhook.ProtectedUrl);
        if (!target.TryGetValue(out var destination))
        {
            return target.Error;
        }

        var product = EmailTexts.Product(settings.InstanceName);
        var language = await db.Users
            .Where(u => u.Id == currentUser.Id)
            .Select(u => u.Language)
            .FirstOrDefaultAsync(cancellationToken);
        var sent = await client.SendAsync(
            destination,
            new DiscordPost(NotificationTexts.DiscordTest(language ?? settings.DefaultLanguage, product), DiscordText.Username(product)),
            cancellationToken);

        webhook.RecordSend(clock.UtcNow, sent.Error?.Message, sent.Error?.Code == ErrorCodes.DiscordWebhookGone);
        await db.SaveChangesAsync(cancellationToken);
        return sent.IsSuccess ? Result.Success() : sent.Error!;
    }
}
