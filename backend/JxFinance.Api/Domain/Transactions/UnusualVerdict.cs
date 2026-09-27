namespace JxFinance.Domain.Transactions;

public sealed record UnusualVerdict(UnusualBasis Basis, decimal TypicalAmount, decimal Factor, int SampleSize);
