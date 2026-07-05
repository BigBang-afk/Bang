using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

public class LocationService : ILocationService
{
	public async Task<bool> HasLocationPermissionAsync()
	{
		var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
		return status == PermissionStatus.Granted;
	}

	public async Task<bool> RequestLocationPermissionAsync()
	{
		var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();

		if (status == PermissionStatus.Granted)
		{
			return true;
		}

		// iOS returns Denied permanently if the user already said no once; on Android a fresh
		// request re-prompts unless "don't ask again" was chosen (Denied there too).
		if (status == PermissionStatus.Denied && DeviceInfo.Platform == DevicePlatform.iOS)
		{
			return false;
		}

		status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
		return status == PermissionStatus.Granted;
	}

	public async Task<(double Latitude, double Longitude)?> GetCurrentLocationAsync()
	{
		if (!await RequestLocationPermissionAsync())
		{
			return null;
		}

		try
		{
			var request = new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(15));
			var location = await Geolocation.Default.GetLocationAsync(request);
			return location is null ? null : (location.Latitude, location.Longitude);
		}
		catch (FeatureNotSupportedException)
		{
			return null;
		}
		catch (FeatureNotEnabledException)
		{
			return null; // location services (GPS) turned off at the OS level
		}
		catch (PermissionException)
		{
			return null;
		}
	}
}
