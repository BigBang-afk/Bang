using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>Resizing/compression helpers for the photos attached to Stock, Customers, Employees, etc.
/// Storing a pre-shrunk thumbnail alongside the full image keeps DataGridView/list rendering fast.</summary>
public static class ImageHelper
{
    /// <summary>Resizes (with aspect ratio preserved, letterboxed to exact size) and re-encodes as JPEG bytes.</summary>
    public static byte[] ResizeToBytes(Image source, int maxWidth, int maxHeight, long jpegQuality = 85L)
    {
        double ratio = Math.Min((double)maxWidth / source.Width, (double)maxHeight / source.Height);
        int newWidth = Math.Max(1, (int)(source.Width * ratio));
        int newHeight = Math.Max(1, (int)(source.Height * ratio));

        using var resized = new Bitmap(newWidth, newHeight);
        using (var graphics = Graphics.FromImage(resized))
        {
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.DrawImage(source, 0, 0, newWidth, newHeight);
        }

        return ToJpegBytes(resized, jpegQuality);
    }

    public static byte[] ToJpegBytes(Image image, long jpegQuality = 85L)
    {
        var encoder = ImageCodecInfo.GetImageEncoders().First(c => c.FormatID == ImageFormat.Jpeg.Guid);
        var encoderParams = new EncoderParameters(1);
        encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, jpegQuality);

        using var stream = new MemoryStream();
        image.Save(stream, encoder, encoderParams);
        return stream.ToArray();
    }

    public static Image? FromBytes(byte[]? bytes)
    {
        if (bytes is null || bytes.Length == 0) return null;
        using var stream = new MemoryStream(bytes);
        return Image.FromStream(stream);
    }

    /// <summary>Generates a 64x64 thumbnail suitable for grid rows and the sidebar avatar.</summary>
    public static byte[] GenerateThumbnail(Image source) => ResizeToBytes(source, 64, 64);
}
