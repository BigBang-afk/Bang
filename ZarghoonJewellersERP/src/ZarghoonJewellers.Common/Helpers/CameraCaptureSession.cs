using FlashCap;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>A camera the user can pick from, wrapping FlashCap's device descriptor.</summary>
public sealed class CameraDeviceInfo
{
    internal CaptureDeviceDescriptor Descriptor { get; }
    public string Name => Descriptor.Name;

    internal CameraDeviceInfo(CaptureDeviceDescriptor descriptor) => Descriptor = descriptor;
}

/// <summary>
/// Thin wrapper around FlashCap (an independent, actively maintained camera capture library
/// that - unlike the older AForge/DirectShow bindings - actually targets net8.0) so the
/// Presentation layer never has to touch FlashCap's callback-based API directly. Delivers
/// each captured frame as a ready-to-display <see cref="Bitmap"/> via <see cref="OnFrame"/>.
/// </summary>
public sealed class CameraCaptureSession : IAsyncDisposable
{
    private CaptureDevice? _device;

    /// <summary>Raised on a background thread for every captured frame - the subscriber
    /// (a WinForms control) is responsible for marshaling back to the UI thread via Invoke.</summary>
    public event Action<Bitmap>? OnFrame;

    public static IReadOnlyList<CameraDeviceInfo> EnumerateDevices()
    {
        var devices = new CaptureDevices();
        return devices.EnumerateDescriptors()
            .Where(d => d.DeviceType == DeviceTypes.DirectShow || d.Characteristics.Count > 0)
            .Select(d => new CameraDeviceInfo(d))
            .ToList();
    }

    public async Task StartAsync(CameraDeviceInfo device)
    {
        if (device.Descriptor.Characteristics.Count == 0)
            throw new InvalidOperationException($"Camera '{device.Name}' does not expose any capture characteristics.");

        // Prefer a modest resolution close to VGA/HD for a fast, low-latency preview rather
        // than whatever the device's maximum (and slowest) mode happens to be.
        var characteristic = device.Descriptor.Characteristics
            .OrderBy(c => Math.Abs(c.Width - 640) + Math.Abs(c.Height - 480))
            .First();

        _device = await device.Descriptor.OpenAsync(characteristic, async bufferScope =>
        {
            try
            {
                var imageBytes = bufferScope.Buffer.ExtractImage();
                using var stream = new MemoryStream(imageBytes);
                var bitmap = (Bitmap)Image.FromStream(stream);
                OnFrame?.Invoke(bitmap);
            }
            catch
            {
                // A single malformed/dropped frame should never bring down the live preview -
                // the next frame will arrive shortly regardless.
            }

            await ValueTask.CompletedTask;
        });

        await _device.StartAsync();
    }

    public async Task StopAsync()
    {
        if (_device is null) return;
        await _device.StopAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (_device is not null)
        {
            await _device.StopAsync();
            _device.Dispose();
            _device = null;
        }
    }
}
