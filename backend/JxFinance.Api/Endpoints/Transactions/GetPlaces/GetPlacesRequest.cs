namespace JxFinance.Endpoints.Transactions.GetPlaces;

public sealed class GetPlacesRequest
{
    public string? Search { get; init; }

    public decimal? Lat { get; init; }

    public decimal? Lon { get; init; }
}
