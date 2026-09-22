using JxFinance.Domain.Common;
using JxFinance.Endpoints.Tags.CreateTag;
using JxFinance.Endpoints.Tags.Shared;
using JxFinance.Endpoints.Tags.UpdateTag;

namespace JxFinance.Endpoints.Tags.Interfaces;

public interface ITagService
{
    Task<IReadOnlyList<TagResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<TagResponse>> CreateAsync(CreateTagRequest request, CancellationToken cancellationToken);

    Task<Result<TagResponse>> UpdateAsync(UpdateTagRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
