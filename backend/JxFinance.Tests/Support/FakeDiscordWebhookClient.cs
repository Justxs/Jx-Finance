using System.Collections.Concurrent;
using JxFinance.Common.Discord;

namespace JxFinance.Tests.Support;

public sealed class FakeDiscordWebhookClient : IDiscordWebhookClient
{
    private readonly ConcurrentQueue<SentDiscordPost> sent = new();
    private readonly ConcurrentDictionary<string, ConcurrentQueue<DiscordSendResult>> scripted = new(StringComparer.Ordinal);

    public Task<DiscordSendResult> SendAsync(DiscordTarget target, DiscordPost post, CancellationToken cancellationToken)
    {
        if (scripted.TryGetValue(target.Id, out var answers) && answers.TryDequeue(out var answer))
        {
            return Task.FromResult(answer);
        }

        sent.Enqueue(new SentDiscordPost(target, post));
        return Task.FromResult(DiscordSendResult.Success);
    }

    public void AnswerNext(string webhookId, DiscordSendResult result) =>
        scripted.GetOrAdd(webhookId, _ => new ConcurrentQueue<DiscordSendResult>()).Enqueue(result);

    public IReadOnlyList<SentDiscordPost> To(string webhookId) =>
        sent.Where(post => post.Target.Id == webhookId).ToList();
}

public sealed record SentDiscordPost(DiscordTarget Target, DiscordPost Post);
