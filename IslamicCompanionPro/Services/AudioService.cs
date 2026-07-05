using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;
#if ANDROID
using Android.Media;
#elif IOS
using AVFoundation;
using Foundation;
#endif

namespace IslamicCompanionPro.Services;

/// <summary>
/// Downloads per-Ayah recitation audio and plays it back using each platform's native player
/// (Android MediaPlayer / iOS AVPlayer) directly, via conditional compilation. This deliberately
/// avoids any third-party audio-playback NuGet package: those come and go/rename their APIs
/// between versions, whereas Android.Media.MediaPlayer and AVFoundation.AVPlayer are part of the
/// platform SDKs themselves and ship with the net9.0-android/net9.0-ios workloads you already have.
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

#if ANDROID
	private MediaPlayer? _androidPlayer;
#elif IOS
	private AVPlayer? _iosPlayer;
#endif

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

	public Task PlayAsync(int globalAyahNumber, string reciterId)
	{
		Stop();

		string localPath = BuildLocalPath(globalAyahNumber, reciterId);

		// Local file if already downloaded (fully offline); otherwise the remote URL — this is the
		// one place in the app that needs internet, and only because the user chose to play
		// un-downloaded audio.
		string source = File.Exists(localPath) ? localPath : BuildAudioUrl(globalAyahNumber, reciterId);

#if ANDROID
		_androidPlayer = new MediaPlayer();
		_androidPlayer.SetDataSource(source);
		_androidPlayer.Prepared += (_, _) => _androidPlayer?.Start();
		_androidPlayer.PrepareAsync();
#elif IOS
		var url = source.StartsWith("http", StringComparison.OrdinalIgnoreCase)
			? NSUrl.FromString(source)
			: NSUrl.FromFilename(source);
		_iosPlayer = AVPlayer.FromUrl(url!);
		_iosPlayer.Play();
#endif

		return Task.CompletedTask;
	}

	public void Stop()
	{
#if ANDROID
		if (_androidPlayer is not null)
		{
			if (_androidPlayer.IsPlaying)
			{
				_androidPlayer.Stop();
			}
			_androidPlayer.Release();
			_androidPlayer.Dispose();
			_androidPlayer = null;
		}
#elif IOS
		if (_iosPlayer is not null)
		{
			_iosPlayer.Pause();
			_iosPlayer.Dispose();
			_iosPlayer = null;
		}
#endif
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
