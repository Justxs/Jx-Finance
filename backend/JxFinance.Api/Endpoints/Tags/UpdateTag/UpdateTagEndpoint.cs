using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Mappers;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.UpdateTag;

public sealed class UpdateTagEndpoint(ITagService tagService)
    : Endpoint<UpdateTagRequest, TagResponse, TagMapper>
{
    public override void Configure()
    {
        Put("tags/{id}");
        Group<TagsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(UpdateTagRequest req, CancellationToken ct)
    {
        var tag = (await tagService.UpdateAsync(req.Id, entity => Map.Apply(req, entity), ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(tag), ct);
    }
}
