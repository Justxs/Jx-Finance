namespace JxFinance.Infrastructure.Data;

public static class QueryFilters
{
    public const string SoftDelete = "SoftDelete";
    public const string Owner = "Owner";

    public static readonly string[] OwnerOnly = [Owner];

    public static readonly string[] SoftDeleteOnly = [SoftDelete];
}
