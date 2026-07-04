# Module 5 — Backend (PlayFab)

## Important: same caveat as Networking (Module 4)

PlayFab requires a real Title ID from the PlayFab Game Manager, which can't be
provisioned in this environment. The PlayFab-backed implementations in
`Backend/Runtime/PlayFab/` are written from real, working knowledge of the PlayFab
Client SDK's actual API shapes (`PlayFabClientAPI.LoginWithCustomIDAsync`,
`GetUserDataAsync`/`UpdateUserDataAsync`, `GetLeaderboardAsync`,
`ExecuteCloudScriptAsync`, etc.) but have **not been compiled against the real SDK**.
Treat them the same way as the Fusion layer: a solid first draft, reconcile against
whatever you actually import.

One extra wrinkle versus Fusion: PlayFab's Unity SDK is often distributed as a plain
folder of source files (not always a proper UPM package with a `package.json`), so
the `versionDefines` entry in `RoyaleClash.Backend.asmdef` (keyed to
`"com.playfab.clientsdk"`) may simply never fire. If `ROYALECLASH_PLAYFAB` doesn't
turn on automatically after importing the SDK, add it manually under **Project
Settings → Player → Scripting Define Symbols**.

### Steps to activate

1. Create a PlayFab title in the Game Manager, note the Title ID.
2. Import the PlayFab Unity SDK.
3. Confirm/fix `ROYALECLASH_PLAYFAB` gets defined (see wrinkle above).
4. Enter the Title ID in `PlayFabSettings` (PlayFab's own config asset) — not
   committed to source control.
5. Write the actual CloudScript functions this module calls into (`grantItems`,
   `consumeItems`, `getClan`, `joinClan`, `leaveClan`, `donateToClan`, `claimMail`,
   `claimAchievement`, `getClaimedAchievements`, `searchPlayers`) — these are
   server-side JS, not something this repo can contain until you're in the PlayFab
   dashboard's CloudScript editor (or Azure Functions if using the newer integration).
6. Call `RoyaleClash.Backend.PlayFab.BackendServices.RegisterPlayFab()` instead of
   `BackendServices.RegisterLocal()` once logged in.

## Why every economy-mutating call routes through CloudScript

PlayFab's client API deliberately has **no** "grant myself an item" or "give myself
gold" endpoint for arbitrary items — and this module doesn't invent a workaround.
`PlayFabInventoryService.GrantItemsAsync`/`ConsumeItemsAsync`,
`PlayFabSocialService`'s clan operations, `PlayFabMailService.ClaimMailAsync`, and
`PlayFabAchievementService.ClaimRewardAsync` all go through
`ICloudFunctionsService.ExecuteAsync` (PlayFab CloudScript) rather than a direct
client call. A modified client can request "give me 1000 gems," but the request is
just that — a request the server-side function is free to reject. This is the same
principle Module 4's networking layer uses for battle actions.

Reads that can't hurt anything (`GetUserInventoryAsync`, `GetFriendsListAsync`,
`GetLeaderboardAsync`, `GetPlayerStatisticsAsync`) call PlayFab's client API directly
— there's no integrity reason to route a read through CloudScript.

## Why Mail and Achievements aren't distinct PlayFab features

PlayFab has no built-in "mail" or "achievements" system. Both are modeled as a
composition of primitives PlayFab does have:

- **Mail** = a JSON array under a Player Data key (`ICloudSaveService`), with
  claiming routed through CloudScript so attachments can't be double-claimed.
- **Achievements** = Title Data (`IRemoteConfigService`) for the *definitions*
  (what counts, what it takes) composed with Statistics (`IPlayerStatsService`) for
  *progress*, and CloudScript for claiming.

## Local implementations are real, not stubs

Everything under `Backend/Runtime/Local/` is a genuine, fully-working in-memory
implementation of every interface — used for Practice mode, first-launch-before-login,
and every EditMode test in this module. `BackendServices.RegisterLocal()` wires
them all into `ServiceLocator` in one call. The rest of the game (UI, Economy,
Progression) is written against the interfaces (`IAuthService`, `ICloudSaveService`,
etc.), never against "Local" or "PlayFab" directly — swapping which half is
registered is the only thing that changes between offline and online play.

## Service map

| Interface | Spec feature(s) | Real PlayFab backing |
|---|---|---|
| `IAuthService` | Authentication | `LoginWithCustomID`, `Link*Account` |
| `ICloudSaveService` | Cloud Save | `GetUserData`/`UpdateUserData` (Player Data) |
| `IInventoryService` | Inventory | `GetUserInventory` (read) + CloudScript (write) |
| `IPlayerStatsService` | Player Stats | `UpdatePlayerStatistics`/`GetPlayerStatistics` |
| `ILeaderboardService` | Leaderboards | `GetLeaderboard`/`GetLeaderboardAroundPlayer` |
| `ISocialService` | Friends, Clan Data | `GetFriendsList`/`AddFriend` (native) + CloudScript (clans) |
| `IMailService` | Mail System | Player Data + CloudScript |
| `IRemoteConfigService` | Events, Offers, Daily Rewards (schema owned by Module 6) | `GetTitleData` |
| `ICloudFunctionsService` | Cloud Functions | `ExecuteCloudScript` |
| `IAchievementService` | Achievements | Title Data + Statistics + CloudScript |

## Known follow-ups

- `PlayFabAuthService.LinkSocialAccountAsync` is a placeholder — PlayFab has a
  distinct `Link*AccountRequest` type per provider; wire in the real ones once
  Module 7 decides which social logins (Google Play Games, Game Center, ...) ship.
- `JsonUtility`-based (de)serialization (used throughout the PlayFab layer) can't
  round-trip a bare primitive or top-level `Dictionary` — wrap those in a small
  `[Serializable]` class, or swap in a full JSON library if that becomes limiting.
- `ClanRole`/donation limits/trophy-gated joining are data shapes only here; the
  actual clan business rules live in the CloudScript functions this module calls,
  not in this repo.
