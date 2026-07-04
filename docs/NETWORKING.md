# Module 4 — Networking (Photon Fusion 2)

## Important: this code has not been compiled against the real Fusion SDK

Photon Fusion 2 requires a free Photon account and an App Id, and is imported into a
Unity project manually (Photon's own package flow) rather than being a plain
resolvable Unity Package Manager dependency — it can't be fetched automatically in
this environment. That means the code in `Networking/Runtime/Fusion/` was written
against Fusion 2's well-documented, stable public API (`NetworkBehaviour`,
`[Networked]`, `[Rpc]`, `NetworkRunner.StartGame`, `INetworkRunnerCallbacks`, etc.)
**from knowledge, not from a real compile**. Treat it as a solid, idiomatic first
draft that needs a reconciliation pass — expect small signature mismatches (an enum
name, an `INetworkRunnerCallbacks` member added/removed between 2.x point releases)
that the compiler will point at directly and trivially once Fusion is actually
imported.

### Why the project still compiles today, before Fusion is imported

Every Fusion-touching file lives under `Networking/Runtime/Fusion/` and is wrapped
in `#if ROYALECLASH_PHOTON_FUSION`. The `RoyaleClash.Networking.asmdef` does **not**
reference a `Fusion` assembly yet (it can't — that assembly doesn't exist until you
import the package, and an unresolvable asmdef reference breaks compilation of the
whole project, `#if` guards or not). So right now that whole folder compiles down to
nothing, and the rest of the module (`MatchMode`, `IMatchHost`, `PracticeMatchHost`,
`SimpleAiOpponent`, etc.) works standalone for local practice play.

### Steps to activate real networking, once you have a Photon account

1. Import Photon Fusion 2 per Photon's own instructions (Photon Dashboard → create
   an app → download/import the Fusion 2 SDK).
2. Add `"Fusion"` (or whatever the imported package's asmdef is actually named — check
   its `.asmdef` file) to the `references` array in
   `Assets/_Project/Scripts/Networking/Runtime/RoyaleClash.Networking.asmdef`.
3. Confirm the `versionDefines` entry already in that asmdef
   (`"name": "com.photonengine.fusion"`) matches the imported package's actual
   `package.json` "name" field — adjust it if not. Once it matches, `ROYALECLASH_PHOTON_FUSION`
   is defined automatically and the Fusion folder starts compiling for real.
4. Fix whatever the compiler flags (see caveat above).
5. Assign the designer-side-only pieces code can't set: `NetworkPrefabRef`s on
   `BattleSessionCoordinator` (player controller, simulation runner, entity view
   prefabs), and each prefab's `NetworkObject` component.
6. Enter your Photon App Id wherever Fusion's `NetworkProjectConfig` expects it —
   **do not commit it**; `Assets/_Project/Config/Secrets.asset` is gitignored for
   exactly this (see `docs/ARCHITECTURE.md`).

## Architecture: server-authoritative snapshot, not per-field lockstep

The Battle module (Module 3) is a deterministic, plain-C# simulation. Rather than
replicate every internal field of every `BattleEntity` via Fusion's networked-object
model, this module runs the **entire** `BattleSimulation` in exactly one place —
the State Authority — and mirrors just the presentation-relevant state (position,
health) into one lightweight `NetworkedBattleEntityView` NetworkObject per entity.
Remote clients never run simulation logic at all.

```
State Authority                          Remote Client
────────────────                          ─────────────
BattleSimulation (real, ticking)          (no BattleSimulation instance)
  │ Tick() each FixedUpdateNetwork
  ▼
writes → NetworkedBattleEntityView (N)  ──replicated──▶  NetworkedBattleEntityView (N)
                                                             │ .ToSnapshot()
                                                             ▼
                                                         BattleEntitySnapshot (same
                                                         shape practice mode uses)
```

This is why `IBattleView`/`IMatchHost` exist: Module 7's UI/rendering code reads
`EntitySnapshots` and calls `RequestDeployTroop`/etc. through that one interface
regardless of whether it's backed by `PracticeMatchHost` (a real local
`BattleSimulation`, zero latency) or `NetworkedMatchHost` (RPCs + replicated views).

## Anti-cheat / server validation

Every gameplay-mutating call is funneled through `BattleSimulation`'s already-validated
`TryDeploy*`/`TryCastSpell`/`TryActivateChampionAbility` methods (Module 3), which only
the State Authority ever calls. A client's `BattlePlayerNetworkController` RPCs can only
*request* an action — the authority decides via the real simulation rules (Elixir cost,
own-side-only placement, cooldowns) and simply doesn't apply an invalid request.
Critically, the acting `PlayerSlot` is always resolved from Fusion's own authenticated
`RpcInfo.Source`/`PlayerRef` for the connection, **never** from a value the client
supplies — a modified client can lie about a card id or a position, but it cannot
act as the other player.

## Matchmaking / GameMode mapping

| MatchMode | Fusion GameMode | Notes |
|---|---|---|
| Practice | *(none — no networking)* | `PracticeMatchHost`, local `BattleSimulation` + `SimpleAiOpponent`. |
| Friendly | `Host` | One peer is both a player and the trusted authority; fine for casual play. |
| Private | `Host` | Same as Friendly, joined via a shared room code. |
| Ranked | `Server` | Dedicated server build holds authority — no competing player can be host. Session/region brokered by PlayFab matchmaking (Module 5), not Photon's own lobby. |
| Tournament | `Server` | Same integrity bar as Ranked. |
| Spectator | `Client` | Joins an existing session read-only. |

## Reconnect

`ReconnectService` remembers the current session name and retries `StartGame` with
`GameMode.Client` against it. The actual "your troops/towers survive while you're
gone" behavior comes from two things working together: Fusion's own disconnect-timeout
grace period (configured in `NetworkProjectConfig`, not in this repo's code) keeping the
session alive, and the fact that `BattleSimulation` only ever runs on the State
Authority — a dropped input-authority client doesn't own any simulation state to lose.

## Lag compensation

This genre doesn't need FPS-style hitscan rewind. What matters instead:
- **Deploy latency masking**: a client can show an immediate local "ghost" placement
  preview at tap time (Module 7) while the RPC round-trips; `RequestAcknowledged`
  fires with the authoritative accept/reject so the UI can correct if needed.
- **Position smoothing**: remote clients read `NetworkedBattleEntityView.NetPosition`
  each `Render()` — Fusion's own interpolation/extrapolation between networked-tick
  snapshots handles the visual smoothing; no custom rewind logic is needed here.

## Known follow-ups (explicit, not hidden)

- The opponent's Elixir is intentionally never replicated (matches genre convention
  of hiding it); the local player's own Elixir needs a small `[Networked]` mirror on
  `BattlePlayerNetworkController` once Module 7's UI needs to show it live.
- `NetworkedMatchHost.EntitySpawned`/`EntityDied` aren't wired to fire — Module 7 is
  expected to diff `EntitySnapshots` frame-to-frame instead (simpler, and sufficient
  at this genre's entity counts). See the comment in `NetworkedMatchHost.cs`.
- 2v2 isn't implemented, but nothing here assumes exactly two `PlayerSlot`s beyond
  `NetworkingConstants.MaxPlayersPerMatch` and `BattleSessionCoordinator`'s pairwise
  spawn — both are the only places that would need to change.
