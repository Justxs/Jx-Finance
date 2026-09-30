using JxFinance.Endpoints.Transactions.GetPlaces;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface IPlaceService
{
    Task<IReadOnlyList<PlaceSuggestionResponse>> GetSuggestionsAsync(GetPlacesRequest request, CancellationToken cancellationToken);
}
