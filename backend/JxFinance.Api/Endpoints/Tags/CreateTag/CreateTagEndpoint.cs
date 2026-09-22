using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
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
        Post(ApiRoutes.Tags);
        Group<TagsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<TagResponse>(201, MediaTypeNames.Application.Json).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateTagRequest req, CancellationToken ct)
    {
        var tag = Map.FromEntity((await tagService.CreateAsync(Map.ToEntity(req), ct)).ValueOrThrow());
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.TagsPath}/{tag.Id}", tag));
    }
}
