using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.GetTags;

public sealed class GetTagsEndpoint(ITagService tagService)
    : EndpointWithoutRequest<IReadOnlyList<TagResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Tags);
        Group<TagsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await tagService.GetAllAsync(ct), ct);
    }
}
