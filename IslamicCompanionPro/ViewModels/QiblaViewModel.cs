using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class QiblaViewModel : BaseViewModel, IAppearingViewModel, IDisposable
{
	private readonly ILocationService _locationService;
	private readonly ICompassService _compassService;
	private readonly IQiblaService _qiblaService;
	private readonly ISettingsService _settingsService;

	[ObservableProperty]
	private double latitude;

	[ObservableProperty]
	private double longitude;

	[ObservableProperty]
	private double qiblaBearingDegrees;

	[ObservableProperty]
	private double distanceKm;

	[ObservableProperty]
	private double compassHeading;

    /// <summary>Rotation to apply to the Qibla needle image: bearing relative to current device heading.</summary>
	[ObservableProperty]
	private double needleRotation;

	[ObservableProperty]
	private bool compassSupported = true;

	[ObservableProperty]
	private bool usingManualLocation;

	[ObservableProperty]
	private string statusMessage = string.Empty;

	public QiblaViewModel(ILocationService locationService, ICompassService compassService,
		IQiblaService qiblaService, ISettingsService settingsService)
	{
		_locationService = locationService;
		_compassService = compassService;
		_qiblaService = qiblaService;
		_settingsService = settingsService;
		Title = "Qibla Finder";

		_compassService.HeadingChanged += OnHeadingChanged;
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		CompassSupported = _compassService.IsSupported;

		var location = await _locationService.GetCurrentLocationAsync();
		if (location is null)
		{
			// Fall back to whatever location the user has saved in Prayer Settings (manual city or last GPS fix).
			var settings = await _settingsService.GetPrayerSettingsAsync();
			if (settings.Latitude == 0 && settings.Longitude == 0)
			{
				StatusMessage = "Location unavailable. Enable GPS or set a manual location in Settings.";
				return;
			}

			Latitude = settings.Latitude;
			Longitude = settings.Longitude;
			UsingManualLocation = true;
		}
		else
		{
			Latitude = location.Value.Latitude;
			Longitude = location.Value.Longitude;
			UsingManualLocation = false;
		}

		var qibla = _qiblaService.CalculateQibla(Latitude, Longitude);
		QiblaBearingDegrees = qibla.QiblaBearingDegrees;
		DistanceKm = qibla.DistanceKm;

		if (CompassSupported)
		{
			_compassService.Start();
		}
		else
		{
			StatusMessage = "No compass sensor detected on this device. Point your device using the bearing shown below relative to true north.";
		}
	}

	[RelayCommand]
	private void Disappearing() => _compassService.Stop();

	private void OnHeadingChanged(object? sender, double heading)
	{
		CompassHeading = heading;
		// Rotate the needle so it always points to the Kaaba regardless of which way the phone faces.
		NeedleRotation = QiblaBearingDegrees - heading;
	}

	public void Dispose()
	{
		_compassService.HeadingChanged -= OnHeadingChanged;
		_compassService.Stop();
	}
}
