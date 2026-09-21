using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
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
    IClock clock,
    BudgetMapper mapper)
    : IBudgetService
{
    public async Task<IReadOnlyList<BudgetResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.ToListAsync(cancellationToken);
        if (budgets.Count == 0)
        {
            return [];
        }

        var usage = await usageCalculator.CalculateAsync(budgets, cancellationToken);
        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        return budgets
            .Select(b => mapper.FromEntity(b, categories.GetValueOrDefault(b.CategoryId)?.Name, usage[b.Id]))
            .ToList();
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

        var budget = mapper.ToEntity(request);

        db.Budgets.Add(budget);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public async Task<Result<BudgetResponse>> UpdateAsync(
        UpdateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(request.Id);
        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, cancellationToken);
        if (budget is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Budget not found.");
        }

        var error = await ValidateAsync(request, budgetId, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        mapper.Apply(request, budget);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(id);
        return db.DeleteOrNotFoundAsync<Budget>(id, b => b.Id == budgetId, "Budget not found.", cancellationToken);
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

    private async Task<Result<BudgetResponse>> ToResponseAsync(Budget budget, CancellationToken cancellationToken)
    {
        var usage = await usageCalculator.CalculateAsync([budget], cancellationToken);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == budget.CategoryId, cancellationToken);

        return mapper.FromEntity(budget, category?.Name, usage[budget.Id]);
    }
}
