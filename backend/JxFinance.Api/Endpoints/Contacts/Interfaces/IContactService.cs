using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Contacts.CreateContact;
using JxFinance.Endpoints.Contacts.CreateContactPayment;
using JxFinance.Endpoints.Contacts.CreateContactSplit;
using JxFinance.Endpoints.Contacts.GetContactEntries;
using JxFinance.Endpoints.Contacts.Shared;
using JxFinance.Endpoints.Contacts.UpdateContact;
using JxFinance.Endpoints.Contacts.UpdateContactSplit;

namespace JxFinance.Endpoints.Contacts.Interfaces;

public interface IContactService
{
    Task<IReadOnlyList<ContactResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<ContactResponse>> CreateAsync(CreateContactRequest request, CancellationToken cancellationToken);

    Task<Result<ContactResponse>> RenameAsync(UpdateContactRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<PagedResponse<ContactEntryResponse>>> GetEntriesAsync(
        GetContactEntriesRequest request,
        CancellationToken cancellationToken);

    Task<Result<ContactEntryResponse>> CreatePaymentAsync(
        CreateContactPaymentRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeletePaymentAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<ContactSplitResponse>> CreateSplitAsync(CreateContactSplitRequest request, CancellationToken cancellationToken);

    Task<Result<ContactSplitResponse>> UpdateSplitAsync(UpdateContactSplitRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteSplitAsync(Guid id, CancellationToken cancellationToken);
}
