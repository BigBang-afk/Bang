using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// Multi-image gallery used on the Stock edit screen: thumbnail strip with "set primary" and
/// delete on each tile, plus "Add Photo" (file picker) and "Camera" (live capture) tiles.
/// Works in two modes: when <see cref="EntityId"/> is set, images are saved/loaded straight
/// through <see cref="IImageService"/>; for a brand-new record that doesn't have an id yet,
/// selected images are held in memory and <see cref="FlushPendingImagesAsync"/> persists them
/// once the caller has saved the parent record and knows its id.
/// </summary>
public class ImageGalleryControl : UserControl
{
    private readonly IImageService _imageService;
    private readonly string _entityType;
    private readonly FlowLayoutPanel _flow;

    private readonly List<(string FileName, byte[] Data)> _pendingImages = new();
    private List<ImageAsset> _savedImages = new();

    public int? EntityId { get; private set; }

    public ImageGalleryControl(IImageService imageService, string entityType)
    {
        _imageService = imageService;
        _entityType = entityType;

        Dock = DockStyle.Top;
        Height = 130;
        BackColor = ThemeColors.BackgroundCard;

        var title = new Label
        {
            Text = "PHOTOS", Dock = DockStyle.Top, Height = 22,
            ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold)
        };

        _flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false, AutoScroll = true, BackColor = ThemeColors.BackgroundCard
        };

        Controls.Add(_flow);
        Controls.Add(title);

        RebuildTiles();
    }

    /// <summary>Switches the gallery into "bound" mode against an existing record and loads its images.</summary>
    public async Task BindToEntityAsync(int entityId)
    {
        EntityId = entityId;
        _savedImages = (await _imageService.GetImagesAsync(_entityType, entityId)).ToList();
        RebuildTiles();
    }

    /// <summary>Saves any images collected before the parent record existed. Call once, right after
    /// the parent's Create call returns its new id.</summary>
    public async Task FlushPendingImagesAsync(int entityId)
    {
        EntityId = entityId;
        foreach (var (fileName, data) in _pendingImages)
            await _imageService.AddImageAsync(_entityType, entityId, fileName, data);

        _pendingImages.Clear();
        _savedImages = (await _imageService.GetImagesAsync(_entityType, entityId)).ToList();
        RebuildTiles();
    }

    private void RebuildTiles()
    {
        _flow.Controls.Clear();

        if (EntityId.HasValue)
        {
            foreach (var image in _savedImages)
                _flow.Controls.Add(BuildSavedTile(image));
        }
        else
        {
            foreach (var pending in _pendingImages)
                _flow.Controls.Add(BuildPendingTile(pending));
        }

        _flow.Controls.Add(BuildActionTile("+ Add Photo", async () => await AddFromFileAsync()));
        _flow.Controls.Add(BuildActionTile("📷 Camera", async () => await AddFromCameraAsync()));
    }

    private Control BuildSavedTile(ImageAsset image)
    {
        var panel = new Guna2Panel { Size = new Size(96, 96), Margin = new Padding(4), BorderRadius = 8, FillColor = ThemeColors.BackgroundDark };

        var pic = new PictureBox
        {
            Size = new Size(96, 96), SizeMode = PictureBoxSizeMode.Zoom,
            Image = ImageHelper.FromBytes(image.ThumbnailData ?? image.ImageData)
        };
        if (image.IsPrimary)
        {
            pic.Padding = new Padding(2);
            panel.BorderColor = ThemeColors.GoldPrimary;
            panel.BorderThickness = 2;
        }

        pic.MouseClick += (_, e) =>
        {
            if (e.Button != MouseButtons.Right) return;
            var menu = new ContextMenuStrip();
            menu.Items.Add("Set as Primary", null, async (_, _) => { await _imageService.SetPrimaryAsync(image.ImageId); await BindToEntityAsync(EntityId!.Value); });
            menu.Items.Add("Delete", null, async (_, _) => { await _imageService.DeleteImageAsync(image.ImageId); await BindToEntityAsync(EntityId!.Value); });
            menu.Show(pic, e.Location);
        };

        panel.Controls.Add(pic);
        return panel;
    }

    private Control BuildPendingTile((string FileName, byte[] Data) pending)
    {
        var panel = new Guna2Panel { Size = new Size(96, 96), Margin = new Padding(4), BorderRadius = 8, FillColor = ThemeColors.BackgroundDark };
        var pic = new PictureBox { Size = new Size(96, 96), SizeMode = PictureBoxSizeMode.Zoom, Image = ImageHelper.FromBytes(pending.Data) };
        pic.MouseClick += (_, e) =>
        {
            if (e.Button != MouseButtons.Right) return;
            var menu = new ContextMenuStrip();
            menu.Items.Add("Remove", null, (_, _) => { _pendingImages.Remove(pending); RebuildTiles(); });
            menu.Show(pic, e.Location);
        };
        panel.Controls.Add(pic);
        return panel;
    }

    private Control BuildActionTile(string text, Action onClick)
    {
        var button = new Guna2Button
        {
            Text = text, Size = new Size(96, 96), Margin = new Padding(4),
            FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextSecondary,
            BorderRadius = 8, BorderThickness = 1, BorderColor = ThemeColors.BorderSubtle,
            Font = new Font("Segoe UI", 8.5F, FontStyle.Bold)
        };
        button.Click += (_, _) => onClick();
        return button;
    }

    private async Task AddFromFileAsync()
    {
        using var dialog = new OpenFileDialog { Filter = "Image files|*.jpg;*.jpeg;*.png;*.bmp", Multiselect = true };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        foreach (var path in dialog.FileNames)
        {
            var bytes = File.ReadAllBytes(path);
            await AddImageBytesAsync(Path.GetFileName(path), bytes);
        }
    }

    private async Task AddFromCameraAsync()
    {
        using var cameraForm = new CameraCaptureForm();
        if (cameraForm.ShowDialog(this) != DialogResult.OK || cameraForm.CapturedImage is null) return;

        var bytes = ImageHelper.ToJpegBytes(cameraForm.CapturedImage);
        await AddImageBytesAsync($"camera-{DateTime.Now:yyyyMMdd-HHmmss}.jpg", bytes);
    }

    private async Task AddImageBytesAsync(string fileName, byte[] bytes)
    {
        if (EntityId.HasValue)
            await _imageService.AddImageAsync(_entityType, EntityId.Value, fileName, bytes);
        else
            _pendingImages.Add((fileName, bytes));

        if (EntityId.HasValue)
            await BindToEntityAsync(EntityId.Value);
        else
            RebuildTiles();
    }
}
