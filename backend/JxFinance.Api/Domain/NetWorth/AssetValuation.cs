namespace JxFinance.Domain.NetWorth;

public sealed class AssetValuation
{
    public const int NoteMaxLength = 200;

    public AssetId AssetId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Value { get; set; }
    public string? Note { get; set; }
}
