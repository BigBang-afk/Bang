namespace IslamicCompanionPro.Services.Interfaces;

public interface ILocationService
{
	/// <summary>True if location permission is already granted (does not prompt).</summary>
	Task<bool> HasLocationPermissionAsync();

	/// <summary>Prompts the user for location permission if not already granted/denied.</summary>
	Task<bool> RequestLocationPermissionAsync();

	/// <summary>
	/// Reads the device GPS location. Returns null if permission is denied, location services are
	/// off, or the request times out — callers should fall back to the manually-selected city.
	/// </summary>
	Task<(double Latitude, double Longitude)?> GetCurrentLocationAsync();
}
