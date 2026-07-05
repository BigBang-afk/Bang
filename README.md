# Islamic Companion Pro

A .NET MAUI (C#) Islamic companion app for Android and iOS: Quran, Duas, Qibla Finder, Azan & Prayer
Timings, Islamic Calendar, Tasbeeh Counter, and Settings — built offline-first with clean (MVVM)
architecture, dependency injection, and a local SQLite database.

## 1. Project Structure

```
IslamicCompanionPro.sln
IslamicCompanionPro/
├── IslamicCompanionPro.csproj      # net8.0-android;net8.0-ios, MAUI SingleProject
├── MauiProgram.cs                  # DI registration (services, ViewModels, Views)
├── App.xaml(.cs)                   # applies saved theme, sets AppShell as MainPage
├── AppShell.xaml(.cs)              # Shell navigation, flyout menu, route registration
│
├── Models/                         # SQLite entity models + enums + DTOs
│   ├── Enums/                      # CalculationMethod, AsrMethod, AppTheme, ...
│   └── Dto/                        # PrayerTimesResult, QiblaResult, HijriDate
│
├── Data/
│   ├── DatabaseService.cs          # ISQLiteDatabaseService impl: creates tables, seeds data
│   └── SeedData/                   # Surah metadata, sample Ayahs/translations, Duas, events
│
├── Services/                       # Business logic, one interface + implementation per concern
│   ├── Interfaces/
│   ├── QuranService.cs / DuaService.cs
│   ├── PrayerTimeService.cs        # astronomical prayer time calculation
│   ├── QiblaService.cs             # great-circle bearing to the Kaaba
│   ├── HijriCalendarService.cs     # tabular Hijri calendar conversion
│   ├── LocationService.cs / CompassService.cs
│   ├── NotificationService.cs      # Azan/reminder scheduling (Plugin.LocalNotification)
│   ├── SettingsService.cs
│   └── AudioService.cs             # Ayah recitation download/playback
│
├── ViewModels/                     # MVVM (CommunityToolkit.Mvvm [ObservableProperty]/[RelayCommand])
├── Views/                          # XAML pages + minimal code-behind
│   └── Base/AppearingContentPage.cs
├── Helpers/                        # Routes, converters
├── Resources/
│   ├── Styles/Colors.xaml, Styles.xaml   # Islamic green/gold/white/black theme, light+dark
│   ├── AppIcon/, Splash/                 # placeholder SVGs — replace with final artwork
│   ├── Fonts/                            # ⚠ add font files yourself, see §2
│   └── Raw/                              # bundle full Quran/Dua JSON here if you add an importer
└── Platforms/
    ├── Android/                    # MainActivity, MainApplication, AndroidManifest.xml
    └── iOS/                        # AppDelegate, Program.cs, Info.plist
```

## 2. Before your first build — assets you must add

This repository intentionally does **not** invent or hand-type large binary/sacred-text assets.
Add these yourself before building:

- **Fonts** → `Resources/Fonts/`
  - `OpenSans-Regular.ttf`, `OpenSans-Semibold.ttf` (Google Fonts, OFL license)
  - An Arabic Uthmani-style font such as `Amiri-Regular.ttf` (amirifont.org) or "KFGQPC Uthmanic
    Script HAFS" for correct Quran rendering — referenced as `FontFamily="Amiri"` throughout the UI.
- **Full Quran text + translations**: `Data/SeedData/AyahSeedData.cs` ships only Al-Fatihah and the
  first 5 Ayahs of Al-Baqarah (enough to exercise every feature). For a production release, download
  the verified corpus from [Tanzil.net](https://tanzil.net/download) (Uthmani text + translations)
  and write a one-time importer (`IQuranService`/`ISQLiteDatabaseService` already expose everything
  needed) that inserts into `QuranAyahs` / `QuranTranslations`. **Never regenerate Quran text from
  memory/AI — always import from a verified source.**
- **Additional Duas**: `Data/SeedData/DuaSeedData.cs` ships one authentic, referenced Dua per
  category. Expand from Hisnul Muslim / Sunnah.com, keeping the `Reference` field populated.
- **Reciter audio CDN**: `Services/AudioService.cs` has a placeholder `RecitationBaseUrl`. Replace it
  with an audio provider you are licensed to use, and adjust `BuildAudioUrl` to match its URL scheme.
- **App icon / splash**: `Resources/AppIcon/*.svg` and `Resources/Splash/splash.svg` are simple
  placeholders in the brand colors — swap in final artwork.
- **Privacy Policy URL**: `ViewModels/AboutViewModel.cs` links a placeholder URL — required by both
  app stores before submission.

## 3. NuGet Packages (already referenced in the .csproj)

| Package | Purpose |
|---|---|
| `Microsoft.Maui.Controls` | MAUI framework |
| `CommunityToolkit.Mvvm` | `[ObservableProperty]` / `[RelayCommand]` source generators |
| `CommunityToolkit.Maui` | Audio playback (`IAudioManager`), converters, alerts |
| `sqlite-net-pcl` + `SQLitePCLRaw.bundle_green` | Local SQLite database/ORM |
| `Plugin.LocalNotification` | Scheduled Azan/reminder notifications |
| `Microsoft.Extensions.Http` | `HttpClient` for optional audio download / update checks |
| `System.Text.Json` | Seed/import data parsing |

Restore with `dotnet restore` (or let Visual Studio restore on open).

## 4. Database Tables (created automatically on first run)

`QuranSurahs`, `QuranAyahs`, `QuranTranslations`, `DuaCategories`, `Duas`, `Bookmarks`, `Favorites`,
`PrayerSettings`, `PrayerTimesCache`, `TasbeehRecords`, `AppSettings`, `AudioDownloads` — see
`Data/DatabaseService.cs` and the classes under `Models/`.

## 5. Prayer Time Accuracy — how it works

`PrayerTimeService` computes prayer times from first principles (Julian date → solar declination +
equation of time → hour-angle solving for each prayer's sun-altitude condition), the same method
used by praytimes.org. **Timezone alone is never sufficient** — every calculation combines:
latitude + longitude + calendar date + timezone + calculation method + Asr convention. Supported
methods: Muslim World League, ISNA, Egyptian, Umm al-Qura, Karachi/University of Islamic Sciences,
and Custom (manual Fajr/Isha angles). Results are cached per-day in `PrayerTimesCache` and
invalidated automatically whenever location/timezone/method/Asr settings change
(`IPrayerTimeService.InvalidateCacheAsync`, called from `SettingsViewModel.SaveAsync`).

The Hijri date (`HijriCalendarService`) uses the deterministic "tabular" Islamic calendar, which can
differ by a day or two from a real moon-sighting announcement — this is why a manual ±day adjustment
is exposed on the Islamic Calendar page.

## 6. Testing Steps

1. **Restore & build**: open `IslamicCompanionPro.sln` in Visual Studio 2022 (17.8+) with the
   **.NET Multi-platform App UI development** workload installed, or run:
   ```
   dotnet workload install maui
   dotnet build -f net8.0-android
   ```
2. **Unit-testable core logic**: `PrayerTimeService.Calculate(...)`, `QiblaService.CalculateQibla(...)`
   and `HijriCalendarService.ToHijri(...)` are pure functions (no I/O) — add an
   `IslamicCompanionPro.Tests` xUnit project and assert known values, e.g. Makkah
   (21.4225, 39.8262) should return a Qibla bearing near 0° and Fajr/Isha close to published
   Umm al-Qura timetables for the same date.
3. **Emulator/device pass** (manual, per module):
   - Quran: open a Surah, search `2:5`, bookmark/favorite an Ayah, change font size, confirm it
     persists after an app restart (offline).
   - Duas: browse each category, search a keyword, copy/share a Dua.
   - Qibla: grant location permission, verify the needle rotates as you turn the device; deny
     permission and confirm the manual-location fallback message appears; test on an
     emulator with no compass to confirm the "no sensor" message shows.
   - Prayer Times: switch calculation method/Asr/timezone in Settings and confirm times change;
     open the Monthly table; verify Sehri/Iftar match Fajr/Maghrib.
   - Notifications: use **Send Test Notification** in Settings; verify Azan notifications fire
     around actual prayer times (safest to test with a reminder set a couple of minutes out).
   - Tasbeeh: increment, reset, add a custom zikr, confirm vibration toggle.
   - Islamic Calendar: adjust the Hijri offset and confirm the date and upcoming-events list update.
   - Settings: Backup, then Restore, then Reset — confirm data survives Backup/Restore and clears
     on Reset.
   - Turn on Airplane Mode and confirm Quran, Duas, Tasbeeh, Prayer Times (once location is cached)
     and Settings all continue to work fully offline.
4. **Dark/Light mode**: toggle the OS theme and the in-app Theme setting; check contrast on every
   page (Colors.xaml / Styles.xaml already provide `AppThemeBinding` pairs for all text/surfaces).

## 7. Build & Publish

### Android
```
dotnet publish -f net8.0-android -c Release -p:AndroidPackageFormat=aab
```
Then, in Visual Studio: **Build > Publish for Android**, or run the command above and sign the
resulting `.aab` with your upload keystore before submitting to Google Play. Set
`ApplicationId`/`ApplicationDisplayVersion`/`ApplicationVersion` in the `.csproj` for each release.

### iOS
Requires a Mac build host (paired with Visual Studio, or `dotnet publish` run directly on macOS)
and an active Apple Developer account.
```
dotnet publish -f net8.0-ios -c Release -p:RuntimeIdentifier=ios-arm64 -p:ArchiveOnBuild=true
```
Then use Xcode/Visual Studio's **Distribute App** flow (or `xcrun altool`/Transporter) to upload the
resulting `.ipa` to App Store Connect. Configure signing (Automatic or Manual provisioning) in
Visual Studio's iOS project properties first.

### Permissions checklist before submitting
- Android: `AndroidManifest.xml` already declares location, notification, exact-alarm, vibrate and
  internet permissions with `android:required="false"` hardware features for compass/GPS.
- iOS: `Info.plist` already declares `NSLocationWhenInUseUsageDescription` and
  `NSUserNotificationsUsageDescription` — both required by App Store review since the app requests
  location and notification permissions.

## 8. Known Gaps / Next Steps

- Full 6236-Ayah Quran text + multi-language translations, and a larger Dua library — see §2.
- Audio CDN integration — see §2.
- True background daily notification refresh: `INotificationService.RescheduleAllAsync()` is called
  on every app foreground/resume; for users who rarely reopen the app, add an Android WorkManager
  periodic job and an iOS `BGTaskScheduler` background refresh task so Azan times stay correct
  across midnight without requiring the user to open the app.
- Localized UI strings (the `AppLanguage` setting is wired end-to-end for storage, but page XAML
  currently shows English text literals — wire up `.resx` resource files for English/Urdu/Arabic
  labels for full localization).
