using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Common.Journal;

public sealed record JournalBook(
    string Member,
    Currency OperatingCurrency,
    DateOnly Today,
    IReadOnlyList<JournalAccount> Accounts,
    IReadOnlyList<JournalOutsideAccount> OutsideAccounts,
    IReadOnlyList<JournalCategory> Categories,
    IReadOnlyList<JournalTransaction> Transactions,
    IReadOnlyList<JournalTransfer> Transfers,
    IReadOnlyList<JournalConversion> Conversions,
    IReadOnlyList<JournalSecurity> Securities,
    IReadOnlyList<JournalInvestment> Investments,
    IReadOnlyList<JournalAsset> Assets,
    IReadOnlyList<JournalDebt> Debts,
    IReadOnlyList<JournalBalance> Balances);

public sealed record JournalAccount(Guid Id, string Name, AccountType Type, Money StartingBalance, DateOnly CreatedOn, Guid? OversoldSale = null);

public sealed record JournalOutsideAccount(Guid Id, string Name);

public sealed record JournalCategory(Guid Id, string Name, FlowType Type, Guid? ParentId);

public sealed record JournalLine(Guid? CategoryId, decimal Amount);

public sealed record JournalDebtPayment(Guid DebtId, Money Principal, decimal Paid);

public sealed record JournalTransaction(
    Guid Id,
    Guid AccountId,
    DateOnly Date,
    FlowType Type,
    Money Amount,
    decimal ReportingAmount,
    string? Description,
    IReadOnlyList<JournalLine> Lines,
    string? Payee = null,
    string? Note = null,
    JournalDebtPayment? DebtPayment = null);

public sealed record JournalTransfer(Guid Id, Guid FromAccountId, Guid ToAccountId, DateOnly Date, Money Sent, Money Received, string? Description);

public sealed record JournalConversion(Guid Id, Guid AccountId, DateOnly Date, Money From, Money To, string? Description);

public sealed record JournalSecurity(Guid Id, string Symbol, Currency Currency, decimal? LastPrice, DateOnly? LastPriceDate, bool Held);

public sealed record JournalInvestment(
    Guid Id,
    Guid AccountId,
    DateOnly Date,
    InvestmentTransactionType Type,
    Guid? SecurityId,
    decimal Quantity,
    decimal Price,
    Money Cash,
    string? Description,
    decimal SoldQuantity = 0m,
    decimal SoldCost = 0m,
    IReadOnlyList<Position.Lot>? OpenLots = null,
    Currency? CostCurrency = null);

public sealed record JournalValuation(DateOnly Date, decimal Value, string? Note);

public sealed record JournalAsset(Guid Id, string Name, AssetType Type, Currency Currency, IReadOnlyList<JournalValuation> Valuations, decimal ValueToday);

public sealed record JournalDebt(Guid Id, string Name, Currency Currency, IReadOnlyList<JournalValuation> Balances);

public sealed record JournalBalance(Guid Of, decimal Amount, Currency? Currency, Guid? SecurityId = null);
