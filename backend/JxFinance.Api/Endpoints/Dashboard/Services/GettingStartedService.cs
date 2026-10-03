using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Dashboard;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Infrastructure.Backups;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Dashboard.Services;

[RegisterService<IGettingStartedService>(LifeTime.Scoped)]
public sealed class GettingStartedService(
    AppDbContext db,
    BackupStore backups,
    IInstanceSettingsStore settings,
    IClock clock) : IGettingStartedService
{
    private const int SortedDays = 30;

    public async Task<IReadOnlyList<GettingStartedStepResponse>> GetAsync(
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var current = settings.Current;
        var steps = new List<GettingStartedStepResponse>
        {
            new(GettingStartedStep.AddAccount, await db.Accounts.AnyAsync(cancellationToken)),
        };

        var hasTransactions = await db.Transactions.AnyAsync(cancellationToken);
        steps.Add(new(GettingStartedStep.AddTransaction, hasTransactions));
        steps.Add(new(GettingStartedStep.SortSpending, hasTransactions && !await HasRecentUncategorizedAsync(cancellationToken)));

        var budgets = current.IsEnabled(Feature.Budgets);
        var goals = current.IsEnabled(Feature.Goals);
        if (budgets || goals)
        {
            var planned = (budgets && await db.Budgets.AnyAsync(cancellationToken))
                || (goals && await db.Goals.AnyAsync(cancellationToken));
            steps.Add(new(GettingStartedStep.PlanAhead, planned));
        }

        if (current.IsEnabled(Feature.RecurringBills))
        {
            steps.Add(new(GettingStartedStep.AddRecurring, await db.RecurringBills.AnyAsync(cancellationToken)));
        }

        steps.Add(new(GettingStartedStep.SecureSignIn, await HasSecondFactorAsync(userId, cancellationToken)));

        if (isAdmin)
        {
            steps.Add(new(GettingStartedStep.InviteMember, await db.Users.AnyAsync(u => u.Id != userId, cancellationToken)));
            steps.Add(new(GettingStartedStep.SetUpEmail, current.Smtp.IsConfigured));
            steps.Add(new(GettingStartedStep.TakeBackup, (await backups.ListAsync(cancellationToken)).Count > 0));
        }

        if (current.IsEnabled(Feature.MonthClose))
        {
            steps.Add(new(GettingStartedStep.CloseMonth, await db.MonthCloses.AnyAsync(cancellationToken)));
        }

        return steps;
    }

    private Task<bool> HasRecentUncategorizedAsync(CancellationToken cancellationToken)
    {
        var since = clock.Today.AddDays(-SortedDays);
        return db.Transactions.AnyAsync(t => t.Date >= since && !t.IsSplit && t.CategoryId == null, cancellationToken);
    }

    private async Task<bool> HasSecondFactorAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.Users.AnyAsync(u => u.Id == userId && u.TwoFactorEnabled, cancellationToken)
        || await db.UserPasskeys.AnyAsync(p => p.UserId == userId, cancellationToken);
}
