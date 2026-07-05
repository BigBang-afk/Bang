using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

public class CompassService : ICompassService
{
	public bool IsSupported => Compass.Default.IsSupported;

	public bool IsMonitoring => Compass.Default.IsMonitoring;

	public event EventHandler<double>? HeadingChanged;

	public CompassService()
	{
		Compass.Default.ReadingChanged += OnReadingChanged;
	}

	public void Start()
	{
		if (!IsSupported || IsMonitoring)
		{
			return;
		}

		// Low-pass filtering smooths jitter so the compass needle doesn't visibly shake.
		Compass.Default.Start(SensorSpeed.UI, applyLowPassFilter: true);
	}

	public void Stop()
	{
		if (IsMonitoring)
		{
			Compass.Default.Stop();
		}
	}

	private void OnReadingChanged(object? sender, CompassChangedEventArgs e)
	{
		HeadingChanged?.Invoke(this, e.Reading.HeadingMagneticNorth);
	}
}
