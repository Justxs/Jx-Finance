using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Goals.CreateGoal;
using JxFinance.Endpoints.Goals.Interfaces;
using JxFinance.Endpoints.Goals.Mappers;
using JxFinance.Endpoints.Goals.Shared;
using JxFinance.Endpoints.Goals.UpdateGoal;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Goals.Services;

[RegisterService<IGoalService>(LifeTime.Scoped)]
public sealed class GoalService(
    AppDbContext db,
    GoalMapper mapper,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IAccountService accounts) : IGoalService
{
    private const string NotFound = "Goal not found.";

    public async Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var goals = await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);
        var balances = await BalancesAsync(goals, cancellationToken);

        return goals.Select(g => mapper.FromEntity(g, Progress(g, balances))).ToList();
    }

    public async Task<Result<GoalResponse>> CreateAsync(
        CreateGoalRequest request,
        CancellationToken cancellationToken)
    {
        var goal = mapper.ToEntity(request);
        if (await FundingAccountErrorAsync(goal, cancellationToken) is { } error)
        {
            return error;
        }

        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(goal, cancellationToken);
    }

    public async Task<Result<GoalResponse>> UpdateAsync(
        UpdateGoalRequest request,
        CancellationToken cancellationToken)
    {
        var goalId = new GoalId(request.Id);
        var found = await db.Goals.FindOrNotFoundAsync(g => g.Id == goalId, NotFound, cancellationToken);
        if (!found.TryGetValue(out var goal))
        {
            return found.Error;
        }

        mapper.Apply(request, goal);
        if (await FundingAccountErrorAsync(goal, cancellationToken) is { } error)
        {
            return error;
        }

        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(goal, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        return db.DeleteOrNotFoundAsync<Goal>(
            id,
            g => g.Id == goalId,
            NotFound,
            goal => deletions.Record(TrashKind.Goal, id, goal.Name),
            cancellationToken);
    }

    private Task<DomainError?> FundingAccountErrorAsync(Goal goal, CancellationToken cancellationToken) =>
        goal.FundingAccountId is { } accountId
            ? references.AccountExistsAsync(accountId, cancellationToken)
            : Task.FromResult<DomainError?>(null);

    private async Task<GoalResponse> ToResponseAsync(Goal goal, CancellationToken cancellationToken) =>
        mapper.FromEntity(goal, Progress(goal, await BalancesAsync([goal], cancellationToken)));

    private Task<IReadOnlyDictionary<AccountId, decimal>> BalancesAsync(
        IReadOnlyList<Goal> goals,
        CancellationToken cancellationToken) =>
        accounts.GetReportingBalancesAsync(
            goals.Where(g => g.Funding == GoalFunding.Account && g.FundingAccountId is not null)
                .Select(g => g.FundingAccountId!.Value)
                .Distinct()
                .ToList(),
            cancellationToken);

    private static decimal? Progress(Goal goal, IReadOnlyDictionary<AccountId, decimal> balances) =>
        goal.ProgressFrom(
            goal.FundingAccountId is { } accountId && balances.TryGetValue(accountId, out var reporting)
                ? reporting
                : null);
}
