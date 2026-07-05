using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

/// <summary>
/// Downloads per-Ayah recitation audio and resolves a playable source for it. Audio is entirely
/// optional per the app's offline-first requirement: nothing here blocks Quran reading,
/// bookmarking or search. Actual playback is done by a CommunityToolkit.Maui
/// &lt;toolkit:MediaElement&gt; in SurahDetailPage.xaml, bound to the source this service returns —
/// that keeps this service free of any dependency on a specific playback API surface.
///
/// IMPORTANT: <see cref="RecitationBaseUrl"/> is a placeholder. Before shipping, replace it with
/// a reciter audio CDN you are licensed/permitted to use (e.g. an API you have a usage agreement
/// with) and update <see cref="BuildAudioUrl"/> to match that provider's URL scheme.
/// </summary>
public class AudioService : IAudioService
{
	private const string RecitationBaseUrl = "https://audio.your-licensed-cdn.example.com";

	private readonly ISQLiteDatabaseService _db;
	private readonly HttpClient _httpClient;

	public AudioService(ISQLiteDatabaseService db, HttpClient httpClient)
	{
		_db = db;
		_httpClient = httpClient;
	}

	private static string BuildAudioUrl(int globalAyahNumber, string reciterId) =>
		$"{RecitationBaseUrl}/{reciterId}/{globalAyahNumber}.mp3";

	private static string BuildLocalPath(int globalAyahNumber, string reciterId)
	{
		string folder = Path.Combine(FileSystem.AppDataDirectory, "audio", reciterId);
		Directory.CreateDirectory(folder);
		return Path.Combine(folder, $"{globalAyahNumber}.mp3");
	}

	public async Task<bool> IsDownloadedAsync(int globalAyahNumber, string reciterId)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<AudioDownload>()
			.Where(a => a.GlobalAyahNumber == globalAyahNumber && a.ReciterId == reciterId)
			.FirstOrDefaultAsync();

		return existing is not null && File.Exists(existing.LocalFilePath);
	}

	public async Task<AudioDownload> DownloadAsync(int globalAyahNumber, string reciterId, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
	{
		await _db.InitializeAsync();
		string localPath = BuildLocalPath(globalAyahNumber, reciterId);
		string url = BuildAudioUrl(globalAyahNumber, reciterId);

		using (var response = await _httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken))
		{
			response.EnsureSuccessStatusCode();
			long? totalBytes = response.Content.Headers.ContentLength;

			await using var httpStream = await response.Content.ReadAsStreamAsync(cancellationToken);
			await using var fileStream = File.Create(localPath);

			var buffer = new byte[81920];
			long readSoFar = 0;
			int bytesRead;
			while ((bytesRead = await httpStream.ReadAsync(buffer, cancellationToken)) > 0)
			{
				await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
				readSoFar += bytesRead;
				if (totalBytes is > 0)
				{
					progress?.Report((double)readSoFar / totalBytes.Value);
				}
			}
		}

		var download = new AudioDownload
		{
			GlobalAyahNumber = globalAyahNumber,
			ReciterId = reciterId,
			LocalFilePath = localPath,
			FileSizeBytes = new FileInfo(localPath).Length,
			DownloadedAtUtc = DateTime.UtcNow
		};

		var existing = await _db.Connection.Table<AudioDownload>()
			.Where(a => a.GlobalAyahNumber == globalAyahNumber && a.ReciterId == reciterId)
			.FirstOrDefaultAsync();

		if (existing is not null)
		{
			download.Id = existing.Id;
			await _db.UpdateAsync(download);
		}
		else
		{
			await _db.InsertAsync(download);
		}

		return download;
	}

	public Task<string> GetPlaybackSourceAsync(int globalAyahNumber, string reciterId)
	{
		string localPath = BuildLocalPath(globalAyahNumber, reciterId);

		// Local file if already downloaded (fully offline); otherwise the remote URL — this is the
		// one place in the app that needs internet, and only because the user chose to play
		// un-downloaded audio.
		string source = File.Exists(localPath) ? localPath : BuildAudioUrl(globalAyahNumber, reciterId);
		return Task.FromResult(source);
	}

	public async Task<List<AudioDownload>> GetDownloadsAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<AudioDownload>().ToListAsync();
	}

	public async Task DeleteDownloadAsync(int audioDownloadId)
	{
		await _db.InitializeAsync();
		var download = await _db.FindAsync<AudioDownload>(audioDownloadId);
		if (download is null)
		{
			return;
		}

		if (File.Exists(download.LocalFilePath))
		{
			File.Delete(download.LocalFilePath);
		}

		await _db.DeleteAsync(download);
	}
}
