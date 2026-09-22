using JxFinance.Common;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Tags;
using JxFinance.Endpoints.Tags.CreateTag;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.Mappers;

public static class TagMapper
{
    public static Tag ToEntity(this CreateTagRequest request)
    {
        var tag = new Tag { Name = request.Name };
        request.ApplyTo(tag);
        return tag;
    }

    public static void ApplyTo(this ITagInput input, Tag tag)
    {
        tag.Name = input.NormalizedName();
        tag.ApplySharing(input);
    }

    public static string NormalizedName(this ITagInput input) => OptionalText.Normalize(input.Name) ?? input.Name;

    public static TagResponse ToResponse(this Tag tag) => new(
        tag.Id.Value,
        tag.Name,
        tag.Scope,
        tag.HouseholdId?.Value);
}
