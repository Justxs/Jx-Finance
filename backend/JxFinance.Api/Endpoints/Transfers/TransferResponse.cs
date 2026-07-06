namespace JxFinance.Endpoints.Transfers;

public sealed record TransferResponse(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    string Amount,
    DateOnly Date,
    string? Description,
    DateTimeOffset CreatedAt);
