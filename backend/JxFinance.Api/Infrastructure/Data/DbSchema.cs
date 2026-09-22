namespace JxFinance.Infrastructure.Data;

public static class DbSchema
{
    public const string Json = "jsonb";
    public const string NotDeletedFilter = "\"IsDeleted\" = false";
    public const string CurrencyColumn = "Currency";
}
