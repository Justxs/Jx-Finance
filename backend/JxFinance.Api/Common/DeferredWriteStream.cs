namespace JxFinance.Common;

public sealed class DeferredWriteStream(Stream inner) : Stream
{
    private readonly MemoryStream pending = new();

    public override bool CanRead => false;

    public override bool CanSeek => false;

    public override bool CanWrite => true;

    public override long Length => throw new NotSupportedException();

    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override void Write(byte[] buffer, int offset, int count) => pending.Write(buffer, offset, count);

    public override void Write(ReadOnlySpan<byte> buffer) => pending.Write(buffer);

    public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
        WriteAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
    {
        await DrainAsync(cancellationToken);
        await inner.WriteAsync(buffer, cancellationToken);
    }

    public override async Task FlushAsync(CancellationToken cancellationToken)
    {
        await DrainAsync(cancellationToken);
        await inner.FlushAsync(cancellationToken);
    }

    public override void Flush()
    {
    }

    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing) pending.Dispose();
        base.Dispose(disposing);
    }

    private async Task DrainAsync(CancellationToken cancellationToken)
    {
        if (pending.Length == 0) return;
        await inner.WriteAsync(pending.GetBuffer().AsMemory(0, (int)pending.Length), cancellationToken);
        pending.SetLength(0);
    }
}
