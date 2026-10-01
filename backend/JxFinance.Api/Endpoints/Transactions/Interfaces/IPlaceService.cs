using JxFinance.Endpoints.Transactions.GetPlaces;
using JxFinance.Endpoints.Transactions.RenamePlace;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface IPlaceService
{
    Task<IReadOnlyList<PlaceSuggestionResponse>> GetSuggestionsAsync(GetPlacesRequest request, CancellationToken cancellationToken);

    Task<RenamePlaceResponse> RenameAsync(RenamePlaceRequest request, CancellationToken cancellationToken);
}
