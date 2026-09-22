using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Tags.Interfaces;

namespace JxFinance.Endpoints.Tags.DeleteTag;

public sealed class DeleteTagEndpoint(ITagService tagService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Tags + "/{id}");
        Group<TagsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        tagService.DeleteAsync(id, ct);
}
