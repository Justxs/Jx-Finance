namespace JxFinance.Endpoints.Transactions.RenamePlace;

public sealed record RenamePlaceRequest(IReadOnlyList<string> Places, string Name)
{
    public const int MaxPlaces = 50;
}
