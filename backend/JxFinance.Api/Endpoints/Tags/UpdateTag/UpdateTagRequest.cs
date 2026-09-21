using JxFinance.Domain.Common;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.UpdateTag;

public sealed record UpdateTagRequest(Guid Id, string Name, Scope Scope, Guid? HouseholdId) : ITagInput;
