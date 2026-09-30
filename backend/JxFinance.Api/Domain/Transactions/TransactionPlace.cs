namespace JxFinance.Domain.Transactions;

public static class TransactionPlace
{
    public const int MaxLength = 120;
    public const int CoordinateDecimals = 5;
    public const decimal MaxLatitude = 90m;
    public const decimal MaxLongitude = 180m;
    public const double NearbyMeters = 150;

    public static bool IsValidPair(decimal? latitude, decimal? longitude) =>
        (latitude, longitude) switch
        {
            (null, null) => true,
            ({ } lat, { } lon) => Math.Abs(lat) <= MaxLatitude && Math.Abs(lon) <= MaxLongitude,
            _ => false,
        };

    public static decimal? Round(decimal? coordinate) =>
        coordinate is { } value ? Math.Round(value, CoordinateDecimals, MidpointRounding.AwayFromZero) : null;
}
