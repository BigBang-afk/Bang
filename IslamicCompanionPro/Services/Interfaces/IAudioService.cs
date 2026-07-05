using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IAudioService
{
	Task<bool> IsDownloadedAsync(int globalAyahNumber, string reciterId);

	/// <summary>Downloads the Ayah's recitation audio to app storage for fully-offline playback later.</summary>
	Task<AudioDownload> DownloadAsync(int globalAyahNumber, string reciterId, IProgress<double>? progress = null, CancellationToken cancellationToken = default);

	/// <summary>
	/// Returns a source suitable for a CommunityToolkit.Maui &lt;MediaElement&gt; to play: the local
	/// file path if already downloaded, otherwise the remote URL (which needs internet). Actual
	/// playback is handled by MediaElement in the page, not by this service.
	/// </summary>
	Task<string> GetPlaybackSourceAsync(int globalAyahNumber, string reciterId);

	Task<List<AudioDownload>> GetDownloadsAsync();
	Task DeleteDownloadAsync(int audioDownloadId);
}
