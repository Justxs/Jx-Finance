using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.SaveAllocationTargets;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IAllocationTargetService>(LifeTime.Scoped)]
public sealed class AllocationTargetService(AppDbContext db, ICurrentUser currentUser) : IAllocationTargetService
{
    private static readonly DomainError UnknownSecurity = new(
        ErrorCodes.AllocationBucketUnknown,
        "A target names a security that does not exist.");

    public async Task<AllocationTargetsResponse> GetAsync(CancellationToken cancellationToken)
    {
        var targets = await db.AllocationTargets.AsNoTracking().ToListAsync(cancellationToken);
        return await ToResponseAsync(targets, cancellationToken);
    }

    public async Task<Result<AllocationTargetsResponse>> SaveAsync(
        SaveAllocationTargetsRequest request,
        CancellationToken cancellationToken)
    {
        var targets = request.Targets
            .Select(target => new AllocationTarget { Dimension = request.Dimension, Key = target.Key, Share = target.Share })
            .ToList();
        if (request.Dimension == AllocationDimension.Security
            && (await SymbolsAsync(targets, cancellationToken)).Count != targets.Count)
        {
            return UnknownSecurity;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(currentUser.Id, cancellationToken);
        await db.AllocationTargets.ExecuteDeleteAsync(cancellationToken);
        db.AllocationTargets.AddRange(targets);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ToResponseAsync(targets, cancellationToken);
    }

    private async Task<AllocationTargetsResponse> ToResponseAsync(
        List<AllocationTarget> targets,
        CancellationToken cancellationToken)
    {
        var symbols = await SymbolsAsync(targets, cancellationToken);
        return new AllocationTargetsResponse(
            targets.Count == 0 ? null : targets[0].Dimension,
            targets
                .OrderByDescending(t => t.Share)
                .ThenBy(t => t.Key, StringComparer.Ordinal)
                .Select(t => new AllocationTargetResponse(t.Key, t.Share, symbols.GetValueOrDefault(t.Key)))
                .ToList());
    }

    private async Task<Dictionary<string, string>> SymbolsAsync(
        List<AllocationTarget> targets,
        CancellationToken cancellationToken)
    {
        var ids = targets
            .Where(t => t.Dimension == AllocationDimension.Security)
            .Select(t => new SecurityId(Guid.Parse(t.Key)))
            .ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var securities = await db.Securities
            .AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .Select(s => new { s.Id, s.Symbol })
            .ToListAsync(cancellationToken);
        return securities.ToDictionary(s => AllocationBucket.Of(s.Id), s => s.Symbol, StringComparer.Ordinal);
    }
}
