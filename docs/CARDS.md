# Module 2 — Card / Troop / Spell Data Layer

## Data model

- `CardDefinition` (abstract `ScriptableObject`) — shared fields every card has: id, name,
  lore, rarity, elixir cost, icon, Addressable prefab reference, optional `Evolution`.
- `TroopDefinition : CardDefinition` — domain (ground/air), target mask, `CardStatBlock`,
  passive `AbilityDefinition[]`.
- `BuildingDefinition : CardDefinition` — stats, lifespan, optional troop-spawner fields,
  optional bonus-Elixir generation (a resource-generating building archetype).
- `SpellDefinition : CardDefinition` — radius, damage, optional `StatusEffectType` + duration,
  optional cast delay (for delayed-effect spells).
- `ChampionDefinition : TroopDefinition` — adds a single player-activated `AbilityDefinition`
  with its own Elixir cost.
- `EvolutionDefinition` — an alternate card form: bonus ability, stat bonus %, shard cost
  (consumed by Economy, Module 6).
- `AbilityDefinition` — pure data (`AbilityCode` + tuning numbers). No ability logic lives in
  the Cards assembly; the Battle simulation's ability executor (Module 3) interprets the code.
- `CardLevelCurve` — one project-wide asset: compounding growth-per-level and max level per
  rarity. All stat scaling reads this asset instead of hardcoding percentages per card.
- `CardDatabase` — the single lookup table of every `CardDefinition` asset, built by a tool,
  never hand-edited.
- `Deck` — plain serializable class (not a `ScriptableObject`) so it round-trips as JSON
  through PlayFab cloud save. `Validate()` is pure C# and covered by unit tests.

## Original content, not Clash Royale's

Card names, lore, and the "Ashenreach" setting (Aether-touched arcane engineers, elemental
beasts, and rift warriors) are original, invented for this project. Stat numbers are
originally balanced, not copied from any existing game. Some card *roles* are inevitably
similar (a tank, a splash-ranged unit, a building-targeting bruiser) because those roles are
generic, unprotectable game-design vocabulary shared across the whole tower-strategy genre —
not specific expression from any one game.

## Regenerating the roster

The initial ~29-card roster is authored as plain data in
`Assets/_Project/Scripts/Cards/Runtime/DefaultCardRosterData.cs` (unit tested directly, no
Editor session required). To turn it into real assets:

1. Open the project in Unity.
2. **Royale Clash ▸ Cards ▸ Generate Default Card Roster** — creates/updates every
   `AbilityDefinition`, `EvolutionDefinition`, and `CardDefinition` asset under
   `Assets/_Project/Data/Cards`, then rebuilds `CardDatabase.asset`.
3. Re-running after editing `DefaultCardRosterData.cs` updates existing assets in place —
   it will not duplicate them or discard an artist's manually-assigned Prefab/Icon fields
   (those aren't touched by the generator).

To add/remove a hand-authored card asset without touching the data table, use
**Royale Clash ▸ Cards ▸ Rebuild Card Database** afterwards to resync `CardDatabase.asset`.

## What's still a placeholder

Every generated card asset has `Prefab` and `Icon` unassigned — there is no bespoke 3D model
or icon art in this pass (see the repo-level scope note). The Battle view layer (Module 3+)
is expected to fall back to a labeled placeholder primitive when `Prefab` is null, so the
game is fully playable end-to-end before real art exists.

## Roster summary

| Rarity | Troops | Buildings | Spells | Champions |
|---|---|---|---|---|
| Common | 6 | 2 | 2 | — |
| Rare | 6 | 1 | 1 | — |
| Epic | 4 | 1 | 1 | — |
| Legendary | 2 | 0 | 1 | — |
| Champion | — | — | — | 2 |

Plus 2 evolutions (Vanguard Recruit, Longbow Skirmisher) and 7 shared ability definitions.
