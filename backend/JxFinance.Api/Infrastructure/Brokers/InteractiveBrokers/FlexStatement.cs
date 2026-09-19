using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Brokers.InteractiveBrokers;

public sealed record FlexInstrument(
    long? ContractId,
    string Symbol,
    string Name,
    string? Isin,
    string? Exchange,
    string AssetCategory,
    string? SubCategory,
    Currency Currency);

public sealed record FlexTrade(
    string Id,
    FlexInstrument Instrument,
    DateOnly Date,
    decimal Quantity,
    decimal Price,
    decimal Proceeds,
    decimal Taxes,
    decimal Commission,
    Currency CommissionCurrency)
{
    public bool IsBuy => Quantity > 0;
}

public sealed record FlexCashTransaction(
    string Id,
    string Type,
    FlexInstrument? Instrument,
    DateOnly Date,
    decimal Amount,
    Currency Currency,
    string? Description);

public sealed record FlexOpenPosition(FlexInstrument Instrument, DateOnly Date, decimal MarkPrice);

public sealed record FlexStatement(
    IReadOnlyList<string> BrokerAccounts,
    IReadOnlyList<FlexTrade> Trades,
    IReadOnlyList<FlexCashTransaction> CashTransactions,
    IReadOnlyList<FlexOpenPosition> OpenPositions,
    int Unreadable);
