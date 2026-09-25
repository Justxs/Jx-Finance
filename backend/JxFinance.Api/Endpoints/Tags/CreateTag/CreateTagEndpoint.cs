using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.CreateTag;

public sealed class CreateTagEndpoint(ITagService tagService)
    : Endpoint<CreateTagRequest, TagResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Tags);
        Group<TagsGroup>();
        Description(d => d.ProducesCreated<TagResponse>().ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateTagRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await tagService.CreateAsync(req, ct), tag => $"{ApiRoutes.TagsPath}/{tag.Id}", ct);
}
