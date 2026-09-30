namespace JxFinance.Common.Places;

public static class GeoDistance
{
    private const double EarthRadiusMeters = 6_371_008.8;

    public static double Meters(decimal fromLatitude, decimal fromLongitude, decimal toLatitude, decimal toLongitude)
    {
        var fromLat = Radians(fromLatitude);
        var toLat = Radians(toLatitude);
        var deltaLat = toLat - fromLat;
        var deltaLon = Radians(toLongitude) - Radians(fromLongitude);
        var a = Math.Pow(Math.Sin(deltaLat / 2), 2) + (Math.Cos(fromLat) * Math.Cos(toLat) * Math.Pow(Math.Sin(deltaLon / 2), 2));
        return 2 * EarthRadiusMeters * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    private static double Radians(decimal degrees) => (double)degrees * Math.PI / 180;
}
