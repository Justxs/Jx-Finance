namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface INetWorthSnapshotter
{
    Task SnapshotAsync(Guid userId, CancellationToken cancellationToken);
}
