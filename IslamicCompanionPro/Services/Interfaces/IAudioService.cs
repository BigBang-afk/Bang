using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IAudioService
{
	Task<bool> IsDownloadedAsync(int globalAyahNumber, string reciterId);

	/// <summary>Downloads the Ayah's recitation audio to app storage for fully-offline playback later.</summary>
	Task<AudioDownload> DownloadAsync(int globalAyahNumber, string reciterId, IProgress<double>? progress = null, CancellationToken cancellationToken = default);

	/// <summary>Plays from the local file if already downloaded, otherwise streams from the network (requires internet).</summary>
	Task PlayAsync(int globalAyahNumber, string reciterId);

	void Stop();

	Task<List<AudioDownload>> GetDownloadsAsync();
	Task DeleteDownloadAsync(int audioDownloadId);
}
