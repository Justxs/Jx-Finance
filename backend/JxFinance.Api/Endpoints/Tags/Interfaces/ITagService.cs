using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;

namespace JxFinance.Endpoints.Tags.Interfaces;

public interface ITagService
{
    Task<IReadOnlyList<Tag>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<Tag>> CreateAsync(Tag tag, CancellationToken cancellationToken);

    Task<Result<Tag>> UpdateAsync(Guid id, Action<Tag> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
