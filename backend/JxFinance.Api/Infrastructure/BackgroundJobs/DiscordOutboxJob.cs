using System.Linq.Expressions;
using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class DiscordOutboxJob(
    IServiceScopeFactory scopeFactory,
    ILogger<DiscordOutboxJob> logger) : ChatOutboxJob<DiscordMessage>(scopeFactory, logger)
{
    protected override string Name => "Discord outbox drain";

    protected override string Channel => "Discord";

    protected override AppLock Lock => AppLock.DiscordOutbox;

    protected override DbSet<DiscordMessage> Messages(AppDbContext db) => db.DiscordMessages;

    protected override bool IsEnabled(InstanceSettingsSnapshot settings) => settings.DiscordEnabled;

    protected override bool IsActive(InstanceSettings settings) =>
        settings is { DiscordEnabled: true, DiscordProtectedUrl.Length: > 0, DiscordDisabledByDiscordAt: null };

    protected override Expression<Func<AppUser, ChosenKinds>> Chosen =>
        u => new ChosenKinds(u.Id, u.DiscordNotificationTypes);

    protected override void Record(InstanceSettings settings, DateTimeOffset now, string? error, bool gone = false) =>
        settings.RecordDiscordSend(now, error, gone);

    protected override Result<Func<string, CancellationToken, Task<ChatSendResult>>> Open(
        IServiceProvider services,
        InstanceSettings settings)
    {
        var target = DiscordWebhookSecret.Read(services.GetRequiredService<IDataProtectionProvider>(), settings.DiscordProtectedUrl);
        if (!target.TryGetValue(out var destination))
        {
            return target.Error;
        }

        var client = services.GetRequiredService<IDiscordWebhookClient>();
        var username = DiscordText.Username(
            EmailTexts.Product(services.GetRequiredService<IInstanceSettingsStore>().Current.InstanceName));
        return new Func<string, CancellationToken, Task<ChatSendResult>>(async (content, ct) =>
        {
            var sent = await client.SendAsync(destination, new DiscordPost(content, username), ct);
            return new ChatSendResult(
                sent.Error,
                sent.Error?.Code == ErrorCodes.DiscordRateLimited ? sent.RetryAfter.GetValueOrDefault() : null,
                sent.Error?.Code == ErrorCodes.DiscordWebhookGone);
        });
    }
}
