using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>Live webcam preview + "Capture" dialog, used by <see cref="ImageGalleryControl"/> for
/// photographing an item directly instead of uploading a file. Backed by <see cref="CameraCaptureSession"/>
/// (FlashCap) rather than the legacy AForge/DirectShow bindings, which don't target .NET 8.</summary>
public class CameraCaptureForm : Form
{
    private readonly Guna2ComboBox _cmbDevice;
    private readonly PictureBox _preview;
    private readonly Guna2Button _btnCapture;
    private readonly Label _lblStatus;

    private CameraCaptureSession? _session;
    private Bitmap? _latestFrame;

    public Bitmap? CapturedImage { get; private set; }

    public CameraCaptureForm()
    {
        Text = "Capture Photo";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(560, 500);
        Font = new Font("Segoe UI", 9.5f);

        Controls.Add(new Label { Text = "CAMERA", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true });
        _cmbDevice = new Guna2ComboBox
        {
            Location = new Point(20, 34), Size = new Size(520, 36), DropDownStyle = ComboBoxStyle.DropDownList,
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6
        };
        Controls.Add(_cmbDevice);

        _preview = new PictureBox
        {
            Location = new Point(20, 80), Size = new Size(520, 340),
            BackColor = Color.Black, SizeMode = PictureBoxSizeMode.Zoom, BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(_preview);

        _lblStatus = new Label { Location = new Point(20, 428), AutoSize = true, ForeColor = ThemeColors.TextMuted, Text = "Starting camera..." };
        Controls.Add(_lblStatus);

        _btnCapture = new Guna2Button
        {
            Text = "CAPTURE", Location = new Point(300, 450), Size = new Size(120, 40),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), Enabled = false
        };
        _btnCapture.Click += (_, _) => Capture();

        var btnCancel = new Guna2Button
        {
            Text = "CANCEL", Location = new Point(430, 450), Size = new Size(110, 40),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8
        };
        btnCancel.Click += (_, _) => { DialogResult = DialogResult.Cancel; Close(); };

        Controls.Add(_btnCapture);
        Controls.Add(btnCancel);

        Load += async (_, _) => await InitializeCameraAsync();
        FormClosed += async (_, _) => await StopCameraAsync();
    }

    private async Task InitializeCameraAsync()
    {
        try
        {
            var devices = CameraCaptureSession.EnumerateDevices();
            if (devices.Count == 0)
            {
                _lblStatus.Text = "No camera was detected on this PC.";
                return;
            }

            _cmbDevice.DataSource = devices.Select(d => d.Name).ToList();
            _cmbDevice.SelectedIndex = 0;

            _session = new CameraCaptureSession();
            _session.OnFrame += OnFrameReceived;
            await _session.StartAsync(devices[0]);

            _lblStatus.Text = "Live preview - click Capture when ready.";
            _btnCapture.Enabled = true;
        }
        catch (Exception ex)
        {
            _lblStatus.Text = $"Could not start the camera: {ex.Message}";
        }
    }

    private void OnFrameReceived(Bitmap frame)
    {
        if (IsDisposed) { frame.Dispose(); return; }

        try
        {
            BeginInvoke(() =>
            {
                var previous = _latestFrame;
                _latestFrame = frame;
                _preview.Image = frame;
                previous?.Dispose();
            });
        }
        catch (ObjectDisposedException)
        {
            frame.Dispose();
        }
    }

    private void Capture()
    {
        if (_latestFrame is null) return;
        CapturedImage = (Bitmap)_latestFrame.Clone();
        DialogResult = DialogResult.OK;
        Close();
    }

    private async Task StopCameraAsync()
    {
        if (_session is not null)
        {
            _session.OnFrame -= OnFrameReceived;
            await _session.DisposeAsync();
            _session = null;
        }
    }
}
