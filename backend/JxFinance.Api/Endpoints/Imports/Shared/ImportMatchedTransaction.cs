namespace JxFinance.Endpoints.Imports.Shared;

public sealed record ImportMatchedTransaction(Guid Id, DateOnly Date, string? Description, Guid? CategoryId);
