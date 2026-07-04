# Royale Clash (working title)

An original real-time 1v1 tower-strategy game for Android — same genre as
Clash Royale, no shared assets, names, art, or code. Built in Unity 6 (URP),
Photon Fusion 2 for authoritative multiplayer, and PlayFab for backend
services.

This repository is being built module by module. See `docs/ARCHITECTURE.md`
for the full system design and module checklist, and `docs/` for per-module
design docs as they land.

## Status

| Module | Status |
|---|---|
| 1. Project foundation & architecture | ✅ done |
| 2. Card/troop/spell data layer | ✅ done |
| 3. Battle system | ⏳ next |
| 4. Networking (Photon Fusion 2) | pending |
| 5. Backend (PlayFab) | pending |
| 6. Economy & progression | pending |
| 7. UI system | pending |
| 8. Arenas / audio / optimization / security / publishing | pending |

## Important scope note

This codebase is a real, compiling Unity project with production-shaped
architecture, data models, and integration code. It does **not** include
bespoke final 3D art, animation, voice acting, licensed music, or a live
Photon/PlayFab deployment — those require human artists/audio engineers and
provisioned cloud accounts, which can't be produced by code generation. Every
system is built so those assets/services can be dropped in without touching
code. See "Scope note" in `docs/ARCHITECTURE.md` for details.

## Opening the project

1. Install Unity 6000.0 LTS via Unity Hub.
2. Open this folder as a Unity project.
3. Photon Fusion 2 and PlayFab require free developer accounts; see
   `docs/NETWORKING.md` and `docs/BACKEND.md` (added in Modules 4-5) for setup.

## Repo layout

See `docs/ARCHITECTURE.md#folder-layout`.
