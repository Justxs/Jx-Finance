using JxFinance.Domain.Common;

namespace JxFinance.Domain.MonthCloses;

public sealed record MonthCloseSnapshot(
    Currency ReportingCurrency,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Net,
    int TransactionCount,
    IReadOnlyList<MonthCloseFigure> Income,
    IReadOnlyList<MonthCloseFigure> Expense,
    IReadOnlyList<Guid> RowIds);

public sealed record MonthCloseFigure(Guid? CategoryId, string? SyntheticGroup, string Name, decimal Amount);
