using JxFinance.Domain.Common;
using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Attachments.Interfaces;

public interface IAttachmentService
{
    Task<Result<IReadOnlyList<AttachmentResponse>>> GetAllAsync(Guid transactionId, CancellationToken cancellationToken);

    Task<Result<AttachmentResponse>> UploadAsync(Guid transactionId, AttachmentUpload upload, CancellationToken cancellationToken);

    Task<Result<AttachmentDownload>> OpenAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
