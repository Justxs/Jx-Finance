using FastEndpoints;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Mappers;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.GetTags;

public sealed class GetTagsEndpoint(ITagService tagService)
    : EndpointWithoutRequest<IReadOnlyList<TagResponse>, TagMapper>
{
    public override void Configure()
    {
        Get("tags");
        Group<TagsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var tags = await tagService.GetAllAsync(ct);
        await Send.OkAsync(tags.Select(Map.FromEntity).ToList(), ct);
    }
}
