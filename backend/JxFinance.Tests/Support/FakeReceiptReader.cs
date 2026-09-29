using System.Collections.Concurrent;
using System.Text.Json.Nodes;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Receipts;

namespace JxFinance.Tests.Support;

public sealed class FakeReceiptReader : IReceiptReader
{
    public const string Maxima = "maxima-2026-09-26";
    public const string Rimi = "rimi-2026-09-20";
    public const string Iki = "iki-2026-09-22";
    public const string Return = "return-2026-09-27";
    public const int InputTokens = 1200;
    public const int OutputTokens = 340;

    private static readonly string[] FixtureCategories = ["Food", "Hygiene"];

    private readonly ConcurrentQueue<ReceiptRequest> calls = new();

    public string Answer { get; set; } = Maxima;

    public DomainError? FailWith { get; set; }

    public TaskCompletionSource? Hold { get; set; }

    public IReadOnlyList<ReceiptRequest> Calls => calls.ToList();

    public static string Fixture(string name, string extension = "json") =>
        File.ReadAllText(RepoPath.Of($"JxFinance.Tests/Support/Receipts/{name}.{extension}"));

    public async Task<Result<ReceiptExtraction>> ReadAsync(ReceiptRequest request, CancellationToken cancellationToken)
    {
        calls.Enqueue(request);
        if (Hold is { } hold)
        {
            await hold.Task.WaitAsync(cancellationToken);
        }

        if (FailWith is { } failure)
        {
            return Result<ReceiptExtraction>.Failure(failure);
        }

        var answer = JsonNode.Parse(Fixture(Answer))!;
        foreach (var item in answer["items"]!.AsArray())
        {
            var number = item!["category"]?.GetValue<int>();
            var index = number is { } fixture ? request.CategoryNames.ToList().IndexOf(FixtureCategories[fixture - 1]) : -1;
            item["category"] = index >= 0 ? index + 1 : null;
        }

        return ReceiptAnswer.Parse(answer.ToJsonString(), request.Input, request.CategoryNames.Count, InputTokens, OutputTokens);
    }

    public Task<Result> CheckKeyAsync(string apiKey, string model, CancellationToken cancellationToken) =>
        Task.FromResult(FailWith is { } failure ? Result.Failure(failure) : Result.Success());

    public void Reset()
    {
        Answer = Maxima;
        FailWith = null;
        Hold = null;
        calls.Clear();
    }
}
