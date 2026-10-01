namespace JxFinance.Domain.Transactions;

public static class TransactionPayee
{
    public const int MaxLength = 200;

    public static string? Clip(string? payee)
    {
        var trimmed = payee?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length <= MaxLength ? trimmed : trimmed[..MaxLength].TrimEnd();
    }
}
