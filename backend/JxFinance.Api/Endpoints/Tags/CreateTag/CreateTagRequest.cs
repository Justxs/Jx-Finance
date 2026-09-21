using JxFinance.Domain.Common;
using JxFinance.Endpoints.Tags.Shared;

namespace JxFinance.Endpoints.Tags.CreateTag;

public sealed record CreateTagRequest(string Name, Scope Scope, Guid? HouseholdId) : ITagInput;
