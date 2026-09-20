using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
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
    ICategoryAttributionService attributions,
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

        var nowLocal = clock.Today;
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var spendByCategory = (await attributions.GetAttributionsAsync(monthStart, monthEnd, FlowType.Expense, cancellationToken))
            .Where(a => a.CategoryId.HasValue)
            .GroupBy(a => a.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(a => a.Amount));

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        return budgets
            .Select(b => mapper.FromEntity(
                b,
                categories.GetValueOrDefault(b.CategoryId)?.Name,
                spendByCategory.GetValueOrDefault(b.CategoryId)))
            .ToList();
    }

    public async Task<Result<BudgetResponse>> CreateAsync(
        CreateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var categoryError = await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        if (categoryError is not null)
        {
            return categoryError;
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

        var categoryError = await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        if (categoryError is not null)
        {
            return categoryError;
        }

        mapper.Apply(request, budget);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(id);
        return db.DeleteOrNotFoundAsync<Budget>(id, b => b.Id == budgetId, "Budget not found.", cancellationToken);
    }

    private Task<DomainError?> ValidateCategoryAsync(Guid categoryId, CancellationToken cancellationToken) =>
        references.CategoryOfTypeAsync(
            new CategoryId(categoryId),
            FlowType.Expense,
            "Budgets can only be set on expense categories.",
            cancellationToken);

    private async Task<Result<BudgetResponse>> ToResponseAsync(Budget budget, CancellationToken cancellationToken)
    {
        var nowLocal = clock.Today;
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var spent = (await attributions.GetAttributionsAsync(monthStart, monthEnd, FlowType.Expense, cancellationToken))
            .Where(a => a.CategoryId == budget.CategoryId)
            .Sum(a => a.Amount);

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == budget.CategoryId, cancellationToken);

        return mapper.FromEntity(budget, category?.Name, spent);
    }
}
