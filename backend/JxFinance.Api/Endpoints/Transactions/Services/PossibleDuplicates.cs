using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Endpoints.Transactions.Services;

public static class PossibleDuplicates
{
    public const int WindowDays = 3;

    public static IQueryable<DuplicatePair> Pairs(AppDbContext db) =>
        from t in db.Transactions
        join o in db.Transactions on t.AccountId equals o.AccountId
        where o.Id != t.Id
            && o.Date >= t.Date.AddDays(-WindowDays)
            && o.Date <= t.Date.AddDays(WindowDays)
            && o.Type == t.Type
            && o.Amount.Amount == t.Amount.Amount
            && o.Amount.Currency == t.Amount.Currency
            && t.Amount.Amount > 0
            && !(t.Source == TransactionSource.Imported && o.Source == TransactionSource.Imported && t.CreatedAt == o.CreatedAt)
            && (t.PayeeKey == null || t.PayeeKey == "" || o.PayeeKey == null || o.PayeeKey == ""
                ? (t.Description ?? "").Trim() == (o.Description ?? "").Trim()
                : t.PayeeKey == o.PayeeKey)
            && !db.DuplicateDismissals.Any(d =>
                (d.TransactionId == t.Id && d.OtherTransactionId == o.Id)
                || (d.TransactionId == o.Id && d.OtherTransactionId == t.Id))
        select new DuplicatePair { Id = t.Id, OtherId = o.Id };
}

public sealed class DuplicatePair
{
    public TransactionId Id { get; init; }

    public TransactionId OtherId { get; init; }
}
