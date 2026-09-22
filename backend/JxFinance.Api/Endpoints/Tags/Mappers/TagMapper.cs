using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Tags;
using JxFinance.Endpoints.Tags.CreateTag;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.Mappers;

public sealed class TagMapper : Mapper<CreateTagRequest, TagResponse, Tag>
{
    public override Tag ToEntity(CreateTagRequest request)
    {
        var tag = new Tag { Name = request.Name };
        Apply(request, tag);
        return tag;
    }

    public void Apply(ITagInput input, Tag tag)
    {
        tag.Name = OptionalText.Normalize(input.Name) ?? input.Name;
        tag.ApplySharing(input);
    }

    public override TagResponse FromEntity(Tag tag) => new(
        tag.Id.Value,
        tag.Name,
        tag.Scope,
        tag.HouseholdId?.Value);
}
