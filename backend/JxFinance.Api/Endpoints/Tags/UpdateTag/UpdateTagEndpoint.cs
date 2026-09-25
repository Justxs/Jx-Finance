using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.UpdateTag;

public sealed class UpdateTagEndpoint(ITagService tagService)
    : Endpoint<UpdateTagRequest, TagResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Tags + "/{id}");
        Group<TagsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(UpdateTagRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await tagService.UpdateAsync(req, ct), ct);
}
