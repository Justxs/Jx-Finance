using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Mappers;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Endpoints.Budgets.UpdateBudget;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Budgets.Services;

[RegisterService<IBudgetService>(LifeTime.Scoped)]
public sealed class BudgetService(
    AppDbContext db,
    IBudgetUsageCalculator usageCalculator,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IInstanceSettingsStore settings)
    : IBudgetService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Budget not found.");

    public async Task<IReadOnlyList<BudgetResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.ToListAsync(cancellationToken);
        return budgets.Count == 0 ? [] : await ToResponsesAsync(budgets, cancellationToken);
    }

    public async Task<Result<BudgetResponse>> CreateAsync(
        CreateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(request, null, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        var budget = request.ToEntity(settings.Current.ReportingCurrency);

        db.Budgets.Add(budget);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public async Task<Result<BudgetResponse>> UpdateAsync(
        UpdateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(request.Id);
        if (await db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, cancellationToken) is not { } budget)
        {
            return NotFound;
        }

        var error = await ValidateAsync(request, budgetId, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        request.ApplyTo(budget, settings.Current.ReportingCurrency);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(id);
        return db.DeleteOrNotFoundAsync<Budget>(
            id,
            b => b.Id == budgetId,
            NotFound.Message,
            async budget =>
            {
                var categoryName = await db.Categories
                    .Where(c => c.Id == budget.CategoryId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync(cancellationToken);
                deletions.Record(TrashKind.Budget, id, $"{categoryName ?? budget.Period.ToString()}, {TrashLabel.Amount(budget.LimitAmount)}");
                return null;
            },
            cancellationToken);
    }

    private async Task<DomainError?> ValidateAsync(
        IBudgetInput input,
        BudgetId? excluding,
        CancellationToken cancellationToken)
    {
        var categoryId = new CategoryId(input.CategoryId);
        var categoryError = await references.CategoryOfTypeAsync(
            categoryId,
            FlowType.Expense,
            "Budgets can only be set on expense categories.",
            cancellationToken);
        if (categoryError is not null)
        {
            return categoryError;
        }

        var taken = await db.Budgets.AnyAsync(
            b => b.CategoryId == categoryId && b.Period == input.Period && (excluding == null || b.Id != excluding),
            cancellationToken);

        return taken
            ? new DomainError(
                ErrorCodes.ConflictDuplicate,
                $"That category already has a {input.Period.ToString().ToLowerInvariant()} budget.")
            : null;
    }

    private async Task<Result<BudgetResponse>> ToResponseAsync(Budget budget, CancellationToken cancellationToken) =>
        (await ToResponsesAsync([budget], cancellationToken))[0];

    private async Task<List<BudgetResponse>> ToResponsesAsync(List<Budget> budgets, CancellationToken cancellationToken)
    {
        var usage = await usageCalculator.CalculateAsync(budgets, cancellationToken);
        var categoryIds = budgets.Select(b => b.CategoryId).Distinct().ToList();
        var names = await db.Categories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken);

        return budgets.Select(b => b.ToResponse(names.GetValueOrDefault(b.CategoryId), usage[b.Id])).ToList();
    }
}
