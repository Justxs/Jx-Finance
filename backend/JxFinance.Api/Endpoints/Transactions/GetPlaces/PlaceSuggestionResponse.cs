namespace JxFinance.Endpoints.Transactions.GetPlaces;

public sealed record PlaceSuggestionResponse(string Name, int Count, decimal? Latitude, decimal? Longitude, bool Nearby)
{
    public const int MaxItems = 20;
}
