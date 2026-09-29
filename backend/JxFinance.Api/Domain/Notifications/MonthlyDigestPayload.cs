using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public sealed record MonthlyDigestPayload(
    Currency Currency,
    string Income,
    string Expense,
    string Net,
    int? KeptPercent,
    IReadOnlyList<MonthlyDigestMover> Movers,
    int Uncategorized,
    int? Unusual,
    int? UnconfirmedRecurring,
    int AccountsNeedingAttention,
    bool Closed);

public sealed record MonthlyDigestMover(string Name, string Amount, string Previous);
