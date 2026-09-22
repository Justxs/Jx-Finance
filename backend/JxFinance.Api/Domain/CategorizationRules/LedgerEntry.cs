using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.CategorizationRules;

public sealed record LedgerEntry(
    TransactionId Id,
    AccountId AccountId,
    FlowType Type,
    decimal Amount,
    string? Description);
