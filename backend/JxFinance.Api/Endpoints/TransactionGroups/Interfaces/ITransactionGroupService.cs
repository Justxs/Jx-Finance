using JxFinance.Domain.Common;
using JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.GetTransactionGroupMembers;
using JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.Interfaces;

public interface ITransactionGroupService
{
    Task<IReadOnlyList<TransactionGroupResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<TransactionGroupResponse>> CreateAsync(CreateTransactionGroupRequest request, CancellationToken cancellationToken);

    Task<Result<TransactionGroupResponse>> RenameAsync(RenameTransactionGroupRequest request, CancellationToken cancellationToken);

    Task<Result> AddAsync(AddToTransactionGroupRequest request, CancellationToken cancellationToken);

    Task<Result> RemoveAsync(Guid id, Guid transactionId, CancellationToken cancellationToken);

    Task<Result<Guid>> UngroupAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<GroupMembersResponse>> GetMembersAsync(GetTransactionGroupMembersRequest request, CancellationToken cancellationToken);
}
