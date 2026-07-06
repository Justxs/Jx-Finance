using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Errors;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.UpdateBudget;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Budgets;

public sealed class BudgetService(AppDbContext db, ICategoryAttributionService attributions, IClock clock)
    : IBudgetService
{
    public async Task<IReadOnlyList<BudgetResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.ToListAsync(cancellationToken);
        if (budgets.Count == 0)
        {
            return [];
        }

        var nowLocal = clock.ToAppTime(clock.UtcNow);
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var spendByCategory = (await attributions.GetAttributionsAsync(monthStart, monthEnd, FlowType.Expense, cancellationToken))
            .Where(a => a.CategoryId.HasValue)
            .GroupBy(a => a.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(a => a.Amount));

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        return budgets
            .Select(b =>
            {
                var spent = spendByCategory.GetValueOrDefault(b.CategoryId);
                var limit = (decimal)b.LimitAmount;
                return new BudgetResponse(
                    b.Id.Value,
                    b.CategoryId.Value,
                    categories.GetValueOrDefault(b.CategoryId)?.Name ?? "Unknown",
                    MoneyWire.ToWire(b.LimitAmount),
                    MoneyWire.ToWire(new Money(spent)),
                    MoneyWire.ToWire(new Money(limit - spent)),
                    b.Period.ToString());
            })
            .ToList();
    }

    public async Task<Result<BudgetResponse>> CreateAsync(
        CreateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var categoryError = await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        if (categoryError is not null)
        {
            return Result<BudgetResponse>.Failure(ErrorCodes.Validation, categoryError);
        }

        var budget = new Budget
        {
            CategoryId = new CategoryId(request.CategoryId),
            LimitAmount = MoneyWire.Parse(request.LimitAmount),
        };

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
            return Result<BudgetResponse>.Failure(ErrorCodes.NotFound, "Budget not found.");
        }

        var categoryError = await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        if (categoryError is not null)
        {
            return Result<BudgetResponse>.Failure(ErrorCodes.Validation, categoryError);
        }

        budget.CategoryId = new CategoryId(request.CategoryId);
        budget.LimitAmount = MoneyWire.Parse(request.LimitAmount);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(id);
        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, cancellationToken);
        if (budget is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Budget not found.");
        }

        db.Budgets.Remove(budget);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private async Task<string?> ValidateCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var typedCategoryId = new CategoryId(categoryId);
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == typedCategoryId, cancellationToken);
        if (category is null)
        {
            return "Category does not exist.";
        }

        return category.Type != FlowType.Expense ? "Budgets can only be set on expense categories." : null;
    }

    private async Task<Result<BudgetResponse>> ToResponseAsync(Budget budget, CancellationToken cancellationToken)
    {
        var nowLocal = clock.ToAppTime(clock.UtcNow);
        var monthStart = new DateOnly(nowLocal.Year, nowLocal.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var spent = (await attributions.GetAttributionsAsync(monthStart, monthEnd, FlowType.Expense, cancellationToken))
            .Where(a => a.CategoryId == budget.CategoryId)
            .Sum(a => a.Amount);

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == budget.CategoryId, cancellationToken);
        var limit = (decimal)budget.LimitAmount;

        return Result<BudgetResponse>.Success(new BudgetResponse(
            budget.Id.Value,
            budget.CategoryId.Value,
            category?.Name ?? "Unknown",
            MoneyWire.ToWire(budget.LimitAmount),
            MoneyWire.ToWire(new Money(spent)),
            MoneyWire.ToWire(new Money(limit - spent)),
            budget.Period.ToString()));
    }
}
