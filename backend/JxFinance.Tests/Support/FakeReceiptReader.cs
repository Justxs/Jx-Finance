using System.Collections.Concurrent;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;

namespace JxFinance.Tests.Support;

public sealed class FakeReceiptReader : IReceiptReader
{
    public const string Maxima = "maxima-2026-09-26";
    public const string MaximaNoisy = "maxima-noisy-2026-09-26";
    public const string Rimi = "rimi-2026-09-20";
    public const string Iki = "iki-2026-09-22";
    public const string Lidl = "lidl-2026-09-24";
    public const string Return = "return-2026-09-27";
    public const string MaximaEmail = "maxima-email-2026-09-22";
    public const string MaximaPaper = "maxima-paper-2026-07-09";
    public const string LidlDeposits = "lidl-deposits-2026-09-28";
    public const string IkiApp = "iki-app-2026-08-12";
    public const string IkiAppDiscounts = "iki-app-2026-07-02";
    public const string Invoice = "invoice-2026-09-30";
    public const string InvoiceEnglish = "invoice-english-2026-09-15";

    private readonly ConcurrentQueue<byte[]> calls = new();

    public bool IsAvailable { get; set; } = true;

    public string Answer { get; set; } = Maxima;

    public DomainError? FailWith { get; set; }

    public Exception? ThrowOnRead { get; set; }

    public TaskCompletionSource? Hold { get; set; }

    public IReadOnlyList<byte[]> Calls => calls.ToList();

    public static string Fixture(string name) =>
        File.ReadAllText(RepoPath.Of($"JxFinance.Tests/Support/Receipts/{name}.txt"));

    public async Task<Result<string>> ReadTextAsync(byte[] image, CancellationToken cancellationToken)
    {
        calls.Enqueue(image);
        if (Hold is { } hold)
        {
            await hold.Task.WaitAsync(cancellationToken);
        }

        if (ThrowOnRead is { } exception)
        {
            throw exception;
        }

        return FailWith is { } failure ? failure : Fixture(Answer);
    }

    public void Reset()
    {
        IsAvailable = true;
        Answer = Maxima;
        FailWith = null;
        ThrowOnRead = null;
        Hold = null;
        calls.Clear();
    }
}
