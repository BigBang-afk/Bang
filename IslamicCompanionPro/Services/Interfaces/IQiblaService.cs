using IslamicCompanionPro.Models.Dto;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IQiblaService
{
	/// <summary>Great-circle bearing (0-360, clockwise from true north) and distance from the given point to the Kaaba.</summary>
	QiblaResult CalculateQibla(double latitude, double longitude);
}
