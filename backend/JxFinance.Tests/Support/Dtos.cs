namespace JxFinance.Tests.Support;

public sealed record IdDto(Guid Id);

public sealed record NamedRow(Guid Id, string Name);

public sealed record SetupDto(string SharedKey);

public sealed record BulkDto(int Updated);

public sealed record CurrenciesDto(string ReportingCurrency, IReadOnlyList<string> Currencies);

public sealed record NotificationDto(Guid Id, Guid? RelatedId, bool IsRead);

public sealed record TrashRow(Guid Id, string Kind, Guid EntityId, string Description, DateTimeOffset DeletedAt);

public sealed record NetWorthSnapshotItemDto(DateOnly Date, string NetWorth);

public sealed record NetWorthHistoryDto(List<NetWorthSnapshotItemDto> Items);

public sealed record PageDto<T>(List<T> Items, int Page, int PageSize, int Total);

public sealed record BalanceDto(string Currency, string Amount);

public sealed record AccountDto(
    Guid Id,
    string Name,
    string? Description,
    string? Iban,
    string Type,
    string StartingBalance,
    string CurrentBalance,
    string Scope,
    Guid? HouseholdId,
    string Currency,
    List<BalanceDto> Balances,
    string ReportingBalance,
    string HoldingsValue);

public sealed record BudgetDto(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string LimitAmount,
    string CarriedAmount,
    string EffectiveLimit,
    string Spent,
    string Remaining,
    string Period,
    bool RolloverEnabled,
    DateOnly WindowStart,
    DateOnly WindowEnd);

public sealed record TransactionLineDto(Guid Id, Guid? CategoryId, string Amount, string? Description);

public sealed record TransactionDto(
    Guid Id,
    Guid AccountId,
    Guid? CategoryId,
    string Type,
    string Amount,
    DateOnly Date,
    string? Description,
    string Source,
    bool IsSplit,
    List<TransactionLineDto>? Lines,
    string Currency,
    string ReportingAmount,
    List<Guid> TagIds);

public sealed record TransferDto(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    string Amount,
    DateOnly Date,
    string? Description,
    string Currency,
    string ReceivedAmount,
    string ReceivedCurrency,
    bool FromAccountImported,
    bool ToAccountImported);
