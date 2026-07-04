# Royale Clash — Architecture Overview

Working title: **Royale Clash** (placeholder — rename before publishing; must not reuse
Supercell trademarks). An original real-time 1v1/2v2 tower-defense strategy game for
Android, built in Unity 6 / URP, with Photon Fusion 2 for networking and PlayFab for
backend services.

## Scope note

This project is generated as a real, buildable Unity codebase and data architecture.
It intentionally does **not** include bespoke final 3D models, animations, voice
performances, licensed music, or a live Photon/PlayFab deployment — those require
human artists/audio engineers and provisioned cloud accounts. Every system is built
so those assets can be dropped in later without changing code: art via Addressables
references, audio via `AudioClip` fields on data assets, network/backend credentials
via `Assets/_Project/Config/Secrets.asset` (gitignored).

## Module map

| # | Module | Assembly | Status |
|---|--------|----------|--------|
| 1 | Project foundation & architecture | — | done |
| 2 | Card/troop/spell data layer | `RoyaleClash.Cards` | done |
| 3 | Battle system (sim core) | `RoyaleClash.Battle` | done |
| 4 | Networking (Photon Fusion 2) | `RoyaleClash.Networking` | done* |
| 5 | Backend (PlayFab) | `RoyaleClash.Backend` | pending |
| 6 | Economy & progression | `RoyaleClash.Economy`, `RoyaleClash.Progression` | pending |
| 7 | UI system | `RoyaleClash.UI` | pending |
| 8 | Arenas / audio / optimization / security / publishing | `RoyaleClash.Audio`, `RoyaleClash.Optimization` | pending |

\* Networking's Fusion-specific layer is written but gated behind `ROYALECLASH_PHOTON_FUSION` and unverified against a real compile — see `docs/NETWORKING.md`. The non-Fusion parts (`IMatchHost`, `PracticeMatchHost`, `SimpleAiOpponent`) are real and tested.

## Folder layout

```
Assets/_Project/
  Scripts/
    Core/           shared types: IDs, math (fixed-point), events, service locator
    Cards/          card/troop/spell/building data model (ScriptableObjects)
    Battle/         deterministic battle simulation (elixir, deploy, AI, towers, spells)
    Networking/     Photon Fusion 2 NetworkBehaviours, matchmaking, reconnection
    Backend/        PlayFab client wrapper, cloud save, leaderboards, clans, mail
    Economy/        currencies, shop, chests, offers
    Progression/    XP/levels, leagues/trophies, battle pass, quests, achievements
    UI/             screen controllers, navigation, view models
    Audio/          audio manager, mixers, music/SFX triggers
    Optimization/   object pooling, addressables bootstrap, LOD helpers
    Editor/         custom inspectors, card/arena authoring tools
  Data/             ScriptableObject instances (Cards, Arenas, Chests)
  Art/              Characters, Environments, UI source art (Addressables groups)
  Audio/            Music, SFX source files
  Prefabs/          troop/building/spell/UI prefabs
  Shaders/          Shader Graph assets
  Scenes/           Boot, MainMenu, Battle, etc.
  Tests/            EditMode + PlayMode NUnit tests
```

## Core design principles

1. **Simulation/presentation split.** `RoyaleClash.Battle` contains no `MonoBehaviour`
   view logic — it's a plain C# deterministic simulation (fixed-point math, fixed
   timestep) that Photon Fusion's authoritative server ticks. Unity `GameObject`
   views subscribe to simulation events and never mutate simulation state directly.
   This is what makes the same core loop run in: local practice/AI mode, networked
   PvP (Fusion), and headless EditMode tests.
2. **Data-driven content.** Every card, troop, spell, building, arena, and chest is a
   `ScriptableObject` asset, not hardcoded logic. Designers/balance changes are data
   edits, not code changes. See Module 2.
3. **Server-authoritative, client-predicted.** All game-affecting decisions (damage,
   elixir spend, RNG for chests) are computed server-side (Fusion host or dedicated
   server) or validated by PlayFab CloudScript; clients predict and reconcile.
4. **Addressables everywhere.** No direct scene references to art/audio assets —
   everything is loaded by address so content can be patched without a binary
   resubmission and so memory is bounded on low-end Android devices.
5. **No placeholders left unmarked.** Where this pass uses primitive geometry or CC0
   stand-in audio instead of bespoke art, the asset name and a code comment say so
   explicitly (e.g. `PLACEHOLDER_` prefix) so it's never mistaken for final content.

## Coding conventions

- C# 9, Unity 6000 LTS, nullable reference types disabled project-wide for engine
  compatibility, explicit null checks at boundaries.
- Namespaces mirror assembly names (`RoyaleClash.Battle`, etc.).
- Simulation code uses deterministic fixed-point (`Fix64`, see `Core/Runtime/Fixed`)
  rather than `float`, so replays and client/server state never diverge from
  floating-point non-determinism across devices.
- Public API documented with a single `<summary>` line; no multi-paragraph
  docstrings.
- One `MonoBehaviour` per file; data classes/interfaces may share a file when small
  and tightly related (e.g. an enum + the type that uses it).

## External services (not provisioned by this pass)

- **Photon Fusion 2**: requires a free Photon account + App Id, entered in
  `Assets/_Project/Config/Secrets.asset` (gitignored). See `docs/NETWORKING.md`.
- **PlayFab**: requires a Title ID from the PlayFab Game Manager, entered the same
  way. See `docs/BACKEND.md`.
- **Google Play Billing / Play Console**: publishing checklist covers account
  setup; see `docs/PUBLISHING_CHECKLIST.md` (Module 8).

## Non-goals of this pass

- Final AAA art, animation, and voice assets (needs human artists/animators/VO).
- Standing up live Photon/PlayFab services with real traffic.
- Legal/trademark clearance of the working title and any names used for cards or
  arenas (placeholder original names are used throughout; a legal/naming review is
  recommended before publishing).
