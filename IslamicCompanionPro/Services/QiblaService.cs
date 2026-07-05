using IslamicCompanionPro.Models.Dto;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

/// <summary>Computes the great-circle (shortest path on a sphere) bearing toward the Kaaba in Makkah.</summary>
public class QiblaService : IQiblaService
{
	private const double KaabaLatitude = 21.4225;
	private const double KaabaLongitude = 39.8262;
	private const double EarthRadiusKm = 6371.0088;

	public QiblaResult CalculateQibla(double latitude, double longitude)
	{
		double phi1 = DegToRad(latitude);
		double phi2 = DegToRad(KaabaLatitude);
		double deltaLambda = DegToRad(KaabaLongitude - longitude);

		double y = Math.Sin(deltaLambda) * Math.Cos(phi2);
		double x = Math.Cos(phi1) * Math.Sin(phi2) - Math.Sin(phi1) * Math.Cos(phi2) * Math.Cos(deltaLambda);

		double bearing = RadToDeg(Math.Atan2(y, x));
		bearing = (bearing + 360.0) % 360.0;

		double a = Math.Sin((phi2 - phi1) / 2) * Math.Sin((phi2 - phi1) / 2) +
				   Math.Cos(phi1) * Math.Cos(phi2) *
				   Math.Sin(deltaLambda / 2) * Math.Sin(deltaLambda / 2);
		double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
		double distanceKm = EarthRadiusKm * c;

		return new QiblaResult
		{
			Latitude = latitude,
			Longitude = longitude,
			QiblaBearingDegrees = bearing,
			DistanceKm = distanceKm
		};
	}

	private static double DegToRad(double deg) => deg * Math.PI / 180.0;
	private static double RadToDeg(double rad) => rad * 180.0 / Math.PI;
}
