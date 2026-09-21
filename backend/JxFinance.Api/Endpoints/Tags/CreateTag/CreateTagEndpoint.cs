using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Mappers;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.CreateTag;

public sealed class CreateTagEndpoint(ITagService tagService)
    : Endpoint<CreateTagRequest, TagResponse, TagMapper>
{
    public override void Configure()
    {
        Post("tags");
        Group<TagsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<TagResponse>(201, "application/json").ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateTagRequest req, CancellationToken ct)
    {
        var tag = Map.FromEntity((await tagService.CreateAsync(Map.ToEntity(req), ct)).ValueOrThrow());
        await Send.ResultAsync(TypedResults.Created($"/api/tags/{tag.Id}", tag));
    }
}
