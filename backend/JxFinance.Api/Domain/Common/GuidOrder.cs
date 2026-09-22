namespace JxFinance.Domain.Common;

public static class GuidOrder
{
    public static int Compare(Guid left, Guid right) =>
        left.ToByteArray(bigEndian: true).AsSpan().SequenceCompareTo(right.ToByteArray(bigEndian: true));
}
