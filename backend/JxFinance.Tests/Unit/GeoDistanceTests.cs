using JxFinance.Common.Places;

namespace JxFinance.Tests.Unit;

public sealed class GeoDistanceTests
{
    [Fact]
    public void The_same_point_is_zero_metres_away() =>
        Assert.Equal(0, GeoDistance.Meters(54.68700m, 25.28000m, 54.68700m, 25.28000m));

    [Fact]
    public void A_thousandth_of_a_degree_of_latitude_is_about_111_metres() =>
        Assert.InRange(GeoDistance.Meters(54.68700m, 25.28000m, 54.68800m, 25.28000m), 110.5, 111.8);

    [Fact]
    public void A_degree_of_longitude_shrinks_with_the_cosine_of_the_latitude() =>
        Assert.InRange(GeoDistance.Meters(54.68700m, 25.28000m, 54.68700m, 25.28100m), 63.8, 64.8);

    [Fact]
    public void Vilnius_to_kaunas_is_about_92_kilometres() =>
        Assert.InRange(GeoDistance.Meters(54.68716m, 25.27965m, 54.89852m, 23.90359m), 91_000, 93_000);

    [Fact]
    public void The_distance_does_not_depend_on_the_direction() =>
        Assert.Equal(
            GeoDistance.Meters(54.68700m, 25.28000m, -33.86880m, 151.20930m),
            GeoDistance.Meters(-33.86880m, 151.20930m, 54.68700m, 25.28000m),
            6);
}
