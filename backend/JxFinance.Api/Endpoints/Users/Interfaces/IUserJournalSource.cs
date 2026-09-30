using JxFinance.Common.Journal;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IUserJournalSource
{
    Task<JournalBook> LoadAsync(Guid userId, CancellationToken cancellationToken);
}
