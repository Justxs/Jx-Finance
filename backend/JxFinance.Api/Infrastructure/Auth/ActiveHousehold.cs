namespace JxFinance.Infrastructure.Auth;

public static class ActiveHousehold
{
    public const string HeaderName = "X-Active-Household";

    public const string QueryName = "activeHousehold";

    public const string ItemKey = "jx.activeHousehold";

    private static readonly string[] DownloadRoutes =
    [
        "/api/transactions/export",
        "/api/transactions/export/pdf",
        "/api/investments/tax-summary/export",
    ];

    public static bool TakesQueryScope(PathString path) =>
        DownloadRoutes.Any(route => path.Equals(route, StringComparison.OrdinalIgnoreCase));
}
