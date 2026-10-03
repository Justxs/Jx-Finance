using System.Collections.Concurrent;
using JxFinance.Common.Telegram;

namespace JxFinance.Tests.Support;

public sealed class FakeTelegramBotClient : ITelegramBotClient
{
    private readonly ConcurrentQueue<SentTelegramMessage> sent = new();
    private readonly ConcurrentDictionary<long, ConcurrentQueue<TelegramSendResult>> scripted = new();

    public Task<TelegramSendResult> SendAsync(TelegramTarget target, string html, CancellationToken cancellationToken)
    {
        if (scripted.TryGetValue(target.ChatId, out var answers) && answers.TryDequeue(out var answer))
        {
            return Task.FromResult(answer);
        }

        sent.Enqueue(new SentTelegramMessage(target, html));
        return Task.FromResult(TelegramSendResult.Success);
    }

    public void AnswerNext(long chatId, TelegramSendResult result) =>
        scripted.GetOrAdd(chatId, _ => new ConcurrentQueue<TelegramSendResult>()).Enqueue(result);

    public IReadOnlyList<SentTelegramMessage> To(long chatId) =>
        sent.Where(message => message.Target.ChatId == chatId).ToList();
}

public sealed record SentTelegramMessage(TelegramTarget Target, string Html);
