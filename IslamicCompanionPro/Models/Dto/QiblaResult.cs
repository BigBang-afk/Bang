namespace IslamicCompanionPro.Models.Dto;

/// <summary>Result of a Qibla bearing calculation from a given point on Earth.</summary>
public class QiblaResult
{
	public double Latitude { get; set; }
	public double Longitude { get; set; }

	/// <summary>Bearing to the Kaaba in degrees clockwise from true north (0-360).</summary>
	public double QiblaBearingDegrees { get; set; }

	/// <summary>Great-circle distance to the Kaaba in kilometers.</summary>
	public double DistanceKm { get; set; }
}
