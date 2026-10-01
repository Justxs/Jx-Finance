using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.RenamePlace;

public sealed class RenamePlaceEndpoint(IPlaceService placeService) : Endpoint<RenamePlaceRequest, RenamePlaceResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transactions + "/places/rename");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.Locations)));
    }

    public override async Task HandleAsync(RenamePlaceRequest req, CancellationToken ct) =>
        await Send.OkAsync(await placeService.RenameAsync(req, ct), ct);
}
