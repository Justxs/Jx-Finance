using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Users.GetUsers;

public sealed class GetUsersRequest
{
    public string? Search { get; init; }

    public string? Role { get; init; }

    public bool? IsActive { get; init; }

    public UserSortField? Sort { get; init; }

    public SortDirection? Direction { get; init; }
}
