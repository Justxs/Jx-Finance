namespace JxFinance.Domain.Trash;

public sealed class DeletionChange
{
    public DeletionEntryId DeletionEntryId { get; set; }
    public DeletionChangeKind Kind { get; set; }
    public Guid RowId { get; set; }
}
