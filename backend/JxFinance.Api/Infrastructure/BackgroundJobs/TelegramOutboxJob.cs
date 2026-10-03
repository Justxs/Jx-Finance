using System.Linq.Expressions;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Common.Telegram;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class TelegramOutboxJob(
    IServiceScopeFactory scopeFactory,
    ILogger<TelegramOutboxJob> logger) : ChatOutboxJob<TelegramMessage>(scopeFactory, logger)
{
    protected override string Name => "Telegram outbox drain";

    protected override string Channel => "Telegram";

    protected override AppLock Lock => AppLock.TelegramOutbox;

    protected override DbSet<TelegramMessage> Messages(AppDbContext db) => db.TelegramMessages;

    protected override bool IsEnabled(InstanceSettingsSnapshot settings) => settings.TelegramEnabled;

    protected override bool IsActive(InstanceSettings settings) =>
        settings is
        {
            TelegramEnabled: true,
            TelegramProtectedToken.Length: > 0,
            TelegramChatId: not null,
            TelegramDisabledByTelegramAt: null,
        };

    protected override Expression<Func<AppUser, ChosenKinds>> Chosen =>
        u => new ChosenKinds(u.Id, u.TelegramNotificationTypes);

    protected override void Record(InstanceSettings settings, DateTimeOffset now, string? error, bool gone = false) =>
        settings.RecordTelegramSend(now, error, gone);

    protected override Result<Func<string, CancellationToken, Task<ChatSendResult>>> Open(
        IServiceProvider services,
        InstanceSettings settings)
    {
        var token = TelegramTokenSecret.Read(services.GetRequiredService<IDataProtectionProvider>(), settings.TelegramProtectedToken);
        if (!token.TryGetValue(out var botToken))
        {
            return token.Error;
        }

        var client = services.GetRequiredService<ITelegramBotClient>();
        return new Func<string, CancellationToken, Task<ChatSendResult>>(async (content, ct) =>
        {
            var sent = await client.SendAsync(settings, botToken, content, ct);
            return new ChatSendResult(
                sent.Error,
                sent.Error?.Code == ErrorCodes.TelegramRateLimited ? sent.RetryAfter.GetValueOrDefault() : null,
                sent.Error?.Code == ErrorCodes.TelegramBotRemoved);
        });
    }
}
