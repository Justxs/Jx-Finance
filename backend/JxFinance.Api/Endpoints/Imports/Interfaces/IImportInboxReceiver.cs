using JxFinance.Endpoints.Imports.Inbox;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportInboxReceiver
{
    Task<string?> ReceiveAsync(InboxDrop drop, CancellationToken cancellationToken);
}
