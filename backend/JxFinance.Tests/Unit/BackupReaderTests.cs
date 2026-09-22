using System.Text;
using System.Text.Json;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Backups;

namespace JxFinance.Tests.Unit;

public sealed class BackupReaderTests
{
    private const string Header = "\"" + BackupJsonNames.Format + "\":\"" + BackupService.Format
        + "\",\"" + BackupJsonNames.Version + "\":1,\"" + BackupJsonNames.CreatedAt + "\":\"2026-09-19T08:00:00+00:00\",\""
        + BackupJsonNames.Migration + "\":\"m1\"";

    [Fact]
    public async Task Tables_and_rows_are_published_in_order_across_buffer_boundaries()
    {
        var longValue = new string('ž', 100_000);
        var rows = string.Join(",", Enumerable.Range(0, 5_000).Select(i => $"[\"{i}\",null]"));
        var json = $"{{{Header},\"tables\":[{{\"name\":\"A\",\"columns\":[\"Id\",\"Note\"],\"rows\":[{rows},[\"big\",\"{longValue}\"]]}},"
            + "{\"name\":\"B\",\"columns\":[\"Id\"],\"rows\":[]}]}";
        var recorder = new Recorder();

        await new BackupReader(recorder).ReadAsync(new TrickleStream(Encoding.UTF8.GetBytes(json)), TestContext.Current.CancellationToken);

        Assert.Equal(new BackupHeader(BackupService.Format, 1, new DateTimeOffset(2026, 9, 19, 8, 0, 0, TimeSpan.Zero), "m1"), recorder.Header);
        Assert.Equal(["begin A Id,Note", "end", "begin B Id", "end"], recorder.Events);
        Assert.Equal(5_001, recorder.Rows.Count);
        Assert.Equal(["4999", null], recorder.Rows[4_999]);
        Assert.Equal(["big", longValue], recorder.Rows[5_000]);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("{\"" + BackupJsonNames.Format + "\":\"" + BackupService.Format + "\"}")]
    [InlineData("{\"tables\":[]}")]
    [InlineData("{" + Header + ",\"tables\":[{\"name\":\"A\",\"rows\":[]}]}")]
    [InlineData("{" + Header + ",\"tables\":[{\"name\":\"A\",\"columns\":[\"Id\"]}]}")]
    [InlineData("{" + Header + ",\"tables\":[{\"name\":\"A\",\"columns\":[\"Id\"],\"rows\":[[1]]}]}")]
    [InlineData("{" + Header + ",\"tables\":[{\"name\":\"A\",\"columns\":[\"Id\"],\"rows\":[{}]}]}")]
    [InlineData("{" + Header + ",\"tables\":[],\"tables\":[]}")]
    [InlineData("{" + Header + ",\"extra\":1,\"tables\":[]}")]
    public async Task Anything_that_is_not_a_backup_document_is_refused(string json)
    {
        var reader = new BackupReader(new Recorder());

        await Assert.ThrowsAsync<BackupFileException>(() =>
            reader.ReadAsync(new MemoryStream(Encoding.UTF8.GetBytes(json)), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Truncated_document_is_a_json_error()
    {
        var reader = new BackupReader(new Recorder());
        var json = $"{{{Header},\"tables\":[{{\"name\":\"A\",\"columns\":[\"Id\"],\"rows\":[[\"1\"]";

        await Assert.ThrowsAnyAsync<JsonException>(() =>
            reader.ReadAsync(new MemoryStream(Encoding.UTF8.GetBytes(json)), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Limited_stream_passes_data_up_to_the_limit_and_fails_beyond_it()
    {
        var data = new byte[1000];
        await using var withinLimit = new LimitedReadStream(new MemoryStream(data), 1000);
        await using var beyondLimit = new LimitedReadStream(new MemoryStream(data), 999);
        using var sink = new MemoryStream();

        await withinLimit.CopyToAsync(sink, TestContext.Current.CancellationToken);

        Assert.Equal(1000, sink.Length);
        await Assert.ThrowsAsync<BackupTooLargeException>(() => beyondLimit.CopyToAsync(Stream.Null, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Whitespace_padding_runs_into_the_limit_instead_of_growing_the_buffer()
    {
        var json = $"{{{Header},\"tables\":[{new string(' ', 4 * 1024 * 1024)}]}}";
        await using var limited = new LimitedReadStream(new MemoryStream(Encoding.UTF8.GetBytes(json)), 1024 * 1024);

        await Assert.ThrowsAsync<BackupTooLargeException>(() =>
            new BackupReader(new Recorder()).ReadAsync(limited, TestContext.Current.CancellationToken));
    }

    private sealed class Recorder : IBackupVisitor
    {
        public BackupHeader? Header { get; private set; }

        public List<string> Events { get; } = [];

        public List<IReadOnlyList<string?>> Rows { get; } = [];

        public Task BeginAsync(BackupHeader header, CancellationToken cancellationToken)
        {
            Header = header;
            return Task.CompletedTask;
        }

        public Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken)
        {
            Events.Add($"begin {name} {string.Join(',', columns)}");
            return Task.CompletedTask;
        }

        public Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken)
        {
            Rows.Add(row);
            return Task.CompletedTask;
        }

        public Task EndTableAsync(CancellationToken cancellationToken)
        {
            Events.Add("end");
            return Task.CompletedTask;
        }
    }

    private sealed class TrickleStream(byte[] data) : MemoryStream(data)
    {
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            base.ReadAsync(buffer[..Math.Min(buffer.Length, 4093)], cancellationToken);
    }
}
