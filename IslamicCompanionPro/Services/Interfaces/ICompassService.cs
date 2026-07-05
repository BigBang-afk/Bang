namespace IslamicCompanionPro.Services.Interfaces;

public interface ICompassService
{
	/// <summary>False on devices/emulators with no magnetometer — QiblaPage should show a manual-fallback message.</summary>
	bool IsSupported { get; }

	bool IsMonitoring { get; }

	/// <summary>Raised with the device's current heading in degrees (0-360, 0 = magnetic north).</summary>
	event EventHandler<double>? HeadingChanged;

	void Start();
	void Stop();
}
