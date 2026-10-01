using JxFinance.Infrastructure.Imports;

namespace JxFinance.Endpoints.Imports.GetImportInboxStatus;

public sealed record ImportInboxStatusResponse(string? Directory, IReadOnlyList<InboxFailure> Failures);
