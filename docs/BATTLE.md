# Module 3 — Battle System

## What this is

A deterministic, server-authoritative 1v1 battle simulation: elixir, deployment,
targeting/movement/combat AI, status effects, spells, towers, and the match state
machine (Battle → Overtime → Ended). It is plain C# — no `MonoBehaviour`, no
`UnityEngine.Time` — so it runs identically in an EditMode test, a local practice
match, or (Module 4) ticked by a Photon Fusion authoritative host.

## Why blueprints instead of ScriptableObjects at runtime

`Cards` ScriptableObjects (`TroopDefinition`, etc.) are the *authoring* format. At
match setup, `BlueprintFactory` converts them (applying `CardLevelCurve` for the
card's level) into plain Fix64-based POCOs — `TroopBlueprint`, `BuildingBlueprint`,
`SpellBlueprint`, `ChampionBlueprint`, `AbilityBlueprint`. The simulation's hot loop
never touches a `ScriptableObject` or `UnityEngine.Object` reference. This is what
makes `BattleSimulation` constructible and tickable directly in a unit test with
zero Unity assets on disk (see `Assets/_Project/Tests/EditMode/Battle/BattleTestFactory.cs`,
which hand-builds blueprints for tests instead of loading real card assets).

## Key types

- `BattleSimulation` (`partial` across 4 files: core/`Deployment`/`Combat`/`Abilities`)
  — the orchestrator. Public API: `Tick(dt)`, `TryDeployTroop/Building`,
  `TryCastSpell`, `TryActivateChampionAbility`, plus `EntitySpawned`/`EntityDied`/
  `MatchEnded` events and `Result`/`Phase`/`Entities`/`GetElixir`/`GetCrowns`.
- `ArenaLayout` — the default symmetric dual-lane arena (river, two bridges, King +
  2 Princess towers per side). One shared layout for now; a future per-arena
  override is a natural Module 8 extension, not a redesign.
- `BattleEntity` → `TroopEntity` / `BuildingEntity` / `TowerEntity` — runtime state.
  Status effects (`Stun`/`Slow`/`Freeze`/`Rage`/`Haste`/`DamageOverTime`) live on the
  base entity as a small list; `Shield` is tracked as explicit absorb-HP rather than
  folded into that list, since it needs to interact with `TakeDamage` directly.
- `TargetingSystem` / `MovementSystem` / `WinConditionEvaluator` — pure static
  systems, each independently unit tested.
- `AbilityCode` (Cards) → interpreted in `BattleSimulation.Abilities.cs`. This is the
  **only** place ability behavior is implemented; adding a new ability means adding
  an `AbilityCode` value (Module 2) and a matching `case` here — Cards/AbilityDefinition
  never contains logic.

## Simplifications (explicit, not hidden)

- **Movement/pathing** is lane-based (walk to your lane's bridge, then to the enemy
  King tower), not full navmesh/steering — the standard simplification for this
  genre. No troop-vs-troop collision avoidance yet.
- **One periodic ability per troop** is assumed (`TroopEntity.AbilityCooldownRemaining`
  is a single shared timer) — true for every troop in the current roster, but a
  troop with two independent periodic abilities would need per-ability timers.
- **Tower stats are fixed constants** (`DefaultTowerBlueprints`), not per-arena data
  yet — Module 8 can introduce per-arena overrides without touching this module.
- **Elixir-cost champion abilities have no additional cooldown** beyond the Elixir
  gate itself.

## Tests

`Assets/_Project/Tests/EditMode/Battle/` covers: Elixir regen/cap/spend, Fix64
vector math, deploy validation (own-side-only, Elixir gating, swarm spawn count),
combat resolution (lethal hit, splash, shield absorption/overflow, slow/freeze
multipliers), win conditions (crowns, tower-damage tiebreak, draw), and full
match-flow (direct spell destroying a King tower ends the match; equal crowns at
time expiry go to Overtime then end in a Draw; deploys are rejected after the
match ends).
