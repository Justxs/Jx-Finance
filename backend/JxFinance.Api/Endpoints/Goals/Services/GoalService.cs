using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
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
    IInstanceSettingsStore settings,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IAccountService accounts) : IGoalService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Goal not found.");

    public async Task<IReadOnlyList<GoalResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var goals = await db.Goals.OrderBy(g => g.CreatedAt).ToListAsync(cancellationToken);
        var balances = await BalancesAsync(goals, cancellationToken);

        return goals.Select(g => g.ToResponse(Progress(g, balances))).ToList();
    }

    public async Task<Result<GoalResponse>> CreateAsync(
        CreateGoalRequest request,
        CancellationToken cancellationToken)
    {
        if (await FundingAccountErrorAsync(request, cancellationToken) is { } error)
        {
            return error;
        }

        var goal = request.ToEntity(settings.Current.ReportingCurrency);
        db.Goals.Add(goal);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(goal, cancellationToken);
    }

    public async Task<Result<GoalResponse>> UpdateAsync(
        UpdateGoalRequest request,
        CancellationToken cancellationToken)
    {
        var goalId = new GoalId(request.Id);
        if (await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId, cancellationToken) is not { } goal)
        {
            return NotFound;
        }

        if (await FundingAccountErrorAsync(request, cancellationToken) is { } error)
        {
            return error;
        }

        request.ApplyTo(goal, settings.Current.ReportingCurrency);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(goal, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var goalId = new GoalId(id);
        return db.DeleteOrNotFoundAsync<Goal>(
            id,
            g => g.Id == goalId,
            NotFound.Message,
            goal => deletions.Record(TrashKind.Goal, id, goal.Name),
            cancellationToken);
    }

    private Task<DomainError?> FundingAccountErrorAsync(IGoalInput input, CancellationToken cancellationToken) =>
        input.FundingAccount() is { } accountId
            ? references.AccountExistsAsync(accountId, cancellationToken)
            : Task.FromResult<DomainError?>(null);

    private async Task<GoalResponse> ToResponseAsync(Goal goal, CancellationToken cancellationToken) =>
        goal.ToResponse(Progress(goal, await BalancesAsync([goal], cancellationToken)));

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
