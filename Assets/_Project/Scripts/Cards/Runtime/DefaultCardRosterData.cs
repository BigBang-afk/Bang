using System.Collections.Generic;
using System.Linq;

namespace RoyaleClash.Cards
{
    public sealed class AbilityRosterEntry
    {
        public string Id;
        public string DisplayName;
        public string Description;
        public AbilityCode Code;
        public StatusEffectType Effect;
        public float Magnitude;
        public float Duration;
        public float Radius;
        public float Cooldown;
        public int ElixirCost;
    }

    public sealed class TroopRosterEntry
    {
        public string Id;
        public string Name;
        public string Lore;
        public CardRarity Rarity;
        public int Elixir;
        public UnitDomain Domain;
        public TargetMask CanTarget;
        public CardStatBlock Stats;
        public string[] AbilityIds = System.Array.Empty<string>();
        public string EvolutionId;
    }

    public sealed class BuildingRosterEntry
    {
        public string Id;
        public string Name;
        public string Lore;
        public CardRarity Rarity;
        public int Elixir;
        public TargetMask CanTarget;
        public CardStatBlock Stats;
        public float LifespanSeconds;
        public string SpawnsTroopCardId;
        public float SpawnIntervalSeconds;
        public float BonusElixirGenerated;
    }

    public sealed class SpellRosterEntry
    {
        public string Id;
        public string Name;
        public string Lore;
        public CardRarity Rarity;
        public int Elixir;
        public float RadiusTiles;
        public int BaseDamage;
        public TargetMask AffectsTargets;
        public StatusEffectType Effect;
        public float EffectMagnitude;
        public float EffectDurationSeconds;
        public float DelaySeconds;
    }

    public sealed class ChampionRosterEntry
    {
        public string Id;
        public string Name;
        public string Lore;
        public int Elixir;
        public UnitDomain Domain;
        public TargetMask CanTarget;
        public CardStatBlock Stats;
        public string ActiveAbilityId;
        public int AbilityElixirCost;
    }

    public sealed class EvolutionRosterEntry
    {
        public string Id;
        public string BaseCardId;
        public string EvolutionName;
        public string Description;
        public string BonusAbilityId;
        public float StatBonusPercent;
        public int ShardsRequired;
    }

    /// <summary>
    /// The initial original card roster, expressed as plain data so it's unit-testable
    /// without a Unity Editor session. "Royale Clash/Cards/Generate Default Card Roster"
    /// (Editor tool, Module 2) reads this table to materialize real CardDefinition
    /// ScriptableObject assets under Assets/_Project/Data/Cards.
    ///
    /// World/theme: an original setting ("Ashenreach") distinct from any existing IP —
    /// arcane engineers, elemental beasts, and rift-touched warriors drawing on a shared
    /// resource called Aether (this game's elixir equivalent). All names, lore, and stat
    /// values below are original.
    /// </summary>
    public static class DefaultCardRosterData
    {
        public static readonly IReadOnlyList<AbilityRosterEntry> Abilities = new List<AbilityRosterEntry>
        {
            new AbilityRosterEntry { Id = "ability_shield_kaelis", DisplayName = "Bulwark Stance", Description = "Kaelis raises an Aether-forged shield, negating the next hits taken.", Code = AbilityCode.SelfShieldOnActivate, Magnitude = 400, Duration = 3f, Cooldown = 0f, ElixirCost = 2 },
            new AbilityRosterEntry { Id = "ability_dash_zeph", DisplayName = "Rift Step", Description = "Zeph blinks to the nearest enemy and strikes for bonus damage.", Code = AbilityCode.DashStrikeOnActivate, Magnitude = 250, Duration = 0f, Cooldown = 0f, ElixirCost = 2 },
            new AbilityRosterEntry { Id = "ability_death_shock", DisplayName = "Rupture", Description = "On death, releases a shockwave that damages nearby enemies.", Code = AbilityCode.ShockwaveOnDeath, Magnitude = 120, Radius = 2.5f },
            new AbilityRosterEntry { Id = "ability_pierce", DisplayName = "Piercing Shot", Description = "Arrows pass through the first target and strike one behind it.", Code = AbilityCode.PierceExtraTargetOnHit, Magnitude = 0.6f },
            new AbilityRosterEntry { Id = "ability_summon_witch", DisplayName = "Rift Call", Description = "Periodically tears open a small rift, summoning a wisp to fight for the caster.", Code = AbilityCode.SummonMinionsPeriodic, Cooldown = 6f },
            new AbilityRosterEntry { Id = "ability_haste_vex", DisplayName = "Temporal Surge", Description = "Nearby allies periodically gain a burst of movement and attack speed.", Code = AbilityCode.HasteAuraPulse, Magnitude = 0.35f, Duration = 2.5f, Cooldown = 5f, Radius = 4f },
            new AbilityRosterEntry { Id = "ability_burn_drake", DisplayName = "Cinderbreath", Description = "Attacks sear the target, applying damage over time.", Code = AbilityCode.BurnOnHit, Effect = StatusEffectType.DamageOverTime, Magnitude = 40, Duration = 3f },
        };

        public static readonly IReadOnlyList<TroopRosterEntry> Troops = new List<TroopRosterEntry>
        {
            // Common
            new TroopRosterEntry { Id = "troop_vanguard_recruit", Name = "Vanguard Recruit", Lore = "Ashenreach's standing line infantry — steady, disciplined, unremarkable alone.", Rarity = CardRarity.Common, Elixir = 3, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 700, damage: 90, hitSpeed: 1.1f, moveSpeed: 1.2f), EvolutionId = "evo_vanguard_recruit" },
            new TroopRosterEntry { Id = "troop_longbow_skirmisher", Name = "Longbow Skirmisher", Lore = "Twin scouts trained to loose arrows before their target closes the distance.", Rarity = CardRarity.Common, Elixir = 3, Domain = UnitDomain.Ground, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 250, damage: 85, hitSpeed: 1.0f, moveSpeed: 1.2f, range: 5f, spawnCount: 2), EvolutionId = "evo_longbow_skirmisher" },
            new TroopRosterEntry { Id = "troop_cinderpup_pack", Name = "Cinderpup Pack", Lore = "Feral rift-beasts that hunt in packs of four, quick and disposable.", Rarity = CardRarity.Common, Elixir = 3, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 90, damage: 45, hitSpeed: 0.8f, moveSpeed: 2.2f, spawnCount: 4) },
            new TroopRosterEntry { Id = "troop_riftwing_swarm", Name = "Riftwing Swarm", Lore = "Small winged rift-spawn that drift over the battlefield in threes.", Rarity = CardRarity.Common, Elixir = 2, Domain = UnitDomain.Air, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 70, damage: 35, hitSpeed: 0.7f, moveSpeed: 2.0f, spawnCount: 3) },
            new TroopRosterEntry { Id = "troop_rubble_slinger", Name = "Rubble Slinger", Lore = "Hurls chunks of quarried stone in a wide, slow arc.", Rarity = CardRarity.Common, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Ranged(health: 400, damage: 110, hitSpeed: 2.2f, moveSpeed: 1.0f, range: 4.5f, splash: 2f) },
            new TroopRosterEntry { Id = "troop_packhound_rider", Name = "Packhound Rider", Lore = "Rides a bred cinderhound at speed, favoring hit-and-run tactics.", Rarity = CardRarity.Common, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 800, damage: 130, hitSpeed: 1.4f, moveSpeed: 2.6f) },

            // Rare
            new TroopRosterEntry { Id = "troop_ironclad_vanguard", Name = "Ironclad Vanguard", Lore = "Encased head to foot in salvaged plate, built to eat tower fire and keep walking.", Rarity = CardRarity.Rare, Elixir = 5, Domain = UnitDomain.Ground, CanTarget = TargetMask.BuildingsOnly, Stats = CardStatBlock.Melee(health: 2600, damage: 150, hitSpeed: 1.5f, moveSpeed: 1.0f) },
            new TroopRosterEntry { Id = "troop_stormcaller_adept", Name = "Stormcaller Adept", Lore = "Channels raw storm-aether into arcing bolts that chain between foes.", Rarity = CardRarity.Rare, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 350, damage: 130, hitSpeed: 1.3f, moveSpeed: 1.2f, range: 4.5f, splash: 1.5f) },
            new TroopRosterEntry { Id = "troop_skyfang_drake", Name = "Skyfang Drake", Lore = "A juvenile drake, agile and vicious, favored as an airborne skirmisher.", Rarity = CardRarity.Rare, Elixir = 4, Domain = UnitDomain.Air, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Melee(health: 900, damage: 140, hitSpeed: 1.2f, moveSpeed: 1.8f) },
            new TroopRosterEntry { Id = "troop_quarry_breaker", Name = "Quarry Breaker", Lore = "A stonecutter turned soldier; his hammer was built to split rock, not armor — it manages both.", Rarity = CardRarity.Rare, Elixir = 5, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 1100, damage: 320, hitSpeed: 2.1f, moveSpeed: 0.9f) },
            new TroopRosterEntry { Id = "troop_emberguard_phalanx", Name = "Emberguard Phalanx", Lore = "Three shieldbearers who fight in lockstep, trading mobility for a hardened line.", Rarity = CardRarity.Rare, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 450, damage: 80, hitSpeed: 1.1f, moveSpeed: 1.1f, spawnCount: 3) },
            new TroopRosterEntry { Id = "troop_nightshade_assassin", Name = "Nightshade Assassin", Lore = "Strikes once, hard, from the shadows between torch-light — then is gone.", Rarity = CardRarity.Rare, Elixir = 3, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 300, damage: 380, hitSpeed: 1.8f, moveSpeed: 2.4f) },

            // Epic
            new TroopRosterEntry { Id = "troop_cataclysm_titan", Name = "Cataclysm Titan", Lore = "A siege-construct animated from a mountain's worth of rubble and old-world aether cores.", Rarity = CardRarity.Epic, Elixir = 7, Domain = UnitDomain.Ground, CanTarget = TargetMask.BuildingsOnly, Stats = CardStatBlock.Melee(health: 4200, damage: 240, hitSpeed: 1.8f, moveSpeed: 0.8f) },
            new TroopRosterEntry { Id = "troop_voidcaller_witch", Name = "Voidcaller Witch", Lore = "Tears small rifts to call wisps to her side, feeding on the aether they leave behind.", Rarity = CardRarity.Epic, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 350, damage: 100, hitSpeed: 1.6f, moveSpeed: 1.1f, range: 5.5f), AbilityIds = new[] { "ability_summon_witch" } },
            new TroopRosterEntry { Id = "troop_bonelash_reaper", Name = "Bonelash Reaper", Lore = "A duelist who fights with a chain-flail forged from a drake's spine.", Rarity = CardRarity.Epic, Elixir = 5, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 1400, damage: 210, hitSpeed: 1.0f, moveSpeed: 1.6f) },
            new TroopRosterEntry { Id = "troop_aetherstorm_wyrm", Name = "Aetherstorm Wyrm", Lore = "An adult drake wreathed in storm-charged aether, breathing arcs of lightning.", Rarity = CardRarity.Epic, Elixir = 6, Domain = UnitDomain.Air, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 2200, damage: 160, hitSpeed: 1.5f, moveSpeed: 1.3f, range: 3.5f, splash: 2f) },

            // Legendary
            new TroopRosterEntry { Id = "troop_emberdrake_sovereign", Name = "Emberdrake Sovereign", Lore = "The last of the old sky-tyrants, wreathed in flame that never quite goes out.", Rarity = CardRarity.Legendary, Elixir = 5, Domain = UnitDomain.Air, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Melee(health: 1300, damage: 190, hitSpeed: 1.3f, moveSpeed: 1.5f), AbilityIds = new[] { "ability_burn_drake" } },
            new TroopRosterEntry { Id = "troop_chronomancer_vex", Name = "Chronomancer Vex", Lore = "A scholar of stolen time, bending the pace of battle around her allies.", Rarity = CardRarity.Legendary, Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 550, damage: 90, hitSpeed: 1.4f, moveSpeed: 1.2f, range: 5f), AbilityIds = new[] { "ability_haste_vex" } },
        };

        public static readonly IReadOnlyList<BuildingRosterEntry> Buildings = new List<BuildingRosterEntry>
        {
            new BuildingRosterEntry { Id = "building_bulwark_turret", Name = "Bulwark Turret", Lore = "A prefabricated Aether turret, quick to deploy and quick to fall.", Rarity = CardRarity.Common, Elixir = 3, CanTarget = TargetMask.GroundAndAir, Stats = CardStatBlock.Ranged(health: 500, damage: 100, hitSpeed: 0.9f, moveSpeed: 0, range: 5.5f), LifespanSeconds = 30f },
            new BuildingRosterEntry { Id = "building_watchtower_sentry", Name = "Watchtower Sentry", Lore = "A garrison post that drip-feeds recruits onto the field for as long as it stands.", Rarity = CardRarity.Common, Elixir = 4, CanTarget = TargetMask.None, Stats = CardStatBlock.Melee(health: 900, damage: 0, hitSpeed: 1f, moveSpeed: 0), LifespanSeconds = 40f, SpawnsTroopCardId = "troop_vanguard_recruit", SpawnIntervalSeconds = 8f },
            new BuildingRosterEntry { Id = "building_aether_conduit", Name = "Aether Conduit", Lore = "A siphon that draws stray Aether from the rift beneath the arena.", Rarity = CardRarity.Rare, Elixir = 5, CanTarget = TargetMask.None, Stats = CardStatBlock.Melee(health: 800, damage: 0, hitSpeed: 1f, moveSpeed: 0), LifespanSeconds = 50f, BonusElixirGenerated = 8f },
            new BuildingRosterEntry { Id = "building_skybreaker_cannon", Name = "Skybreaker Cannon", Lore = "A long-barreled siege cannon, slow to load but devastating on a single target.", Rarity = CardRarity.Epic, Elixir = 5, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Ranged(health: 1000, damage: 300, hitSpeed: 2.5f, moveSpeed: 0, range: 7f), LifespanSeconds = 35f },
        };

        public static readonly IReadOnlyList<SpellRosterEntry> Spells = new List<SpellRosterEntry>
        {
            new SpellRosterEntry { Id = "spell_emberlash_bolt", Name = "Emberlash Bolt", Lore = "A concentrated bolt of raw Aether fire.", Rarity = CardRarity.Common, Elixir = 3, RadiusTiles = 2f, BaseDamage = 250, AffectsTargets = TargetMask.GroundAndAir },
            new SpellRosterEntry { Id = "spell_aether_barrier", Name = "Aether Barrier", Lore = "A pulse of hardened air that slows and scatters anything caught inside it.", Rarity = CardRarity.Common, Elixir = 3, RadiusTiles = 3.5f, BaseDamage = 0, AffectsTargets = TargetMask.GroundAndAir, Effect = StatusEffectType.Slow, EffectMagnitude = 0.5f, EffectDurationSeconds = 3f },
            new SpellRosterEntry { Id = "spell_frostbind_cascade", Name = "Frostbind Cascade", Lore = "Rime-aether that freezes anything it touches in place.", Rarity = CardRarity.Rare, Elixir = 4, RadiusTiles = 3f, BaseDamage = 80, AffectsTargets = TargetMask.GroundAndAir, Effect = StatusEffectType.Freeze, EffectMagnitude = 1f, EffectDurationSeconds = 2.5f },
            new SpellRosterEntry { Id = "spell_tempest_surge", Name = "Tempest Surge", Lore = "Calls down a chain of lightning that arcs between the largest threats on the field.", Rarity = CardRarity.Epic, Elixir = 4, RadiusTiles = 3.5f, BaseDamage = 320, AffectsTargets = TargetMask.GroundAndAir },
            new SpellRosterEntry { Id = "spell_graveborn_swarm", Name = "Graveborn Swarm", Lore = "A delayed rite that tears the earth open, spilling restless spirits at the target.", Rarity = CardRarity.Legendary, Elixir = 5, RadiusTiles = 4f, BaseDamage = 60, AffectsTargets = TargetMask.Ground, DelaySeconds = 3.5f },
        };

        public static readonly IReadOnlyList<ChampionRosterEntry> Champions = new List<ChampionRosterEntry>
        {
            new ChampionRosterEntry { Id = "champion_warden_kaelis", Name = "Warden Kaelis, the Unbroken", Lore = "Once the arena's last line of defense, now fighting for whoever fields her banner.", Elixir = 5, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 2400, damage: 170, hitSpeed: 1.3f, moveSpeed: 1.2f), ActiveAbilityId = "ability_shield_kaelis", AbilityElixirCost = 2 },
            new ChampionRosterEntry { Id = "champion_zeph_blade", Name = "Zeph, Blade of the Rift", Lore = "A duelist who trained on the far side of a rift no one else returned from.", Elixir = 4, Domain = UnitDomain.Ground, CanTarget = TargetMask.Ground, Stats = CardStatBlock.Melee(health: 1100, damage: 220, hitSpeed: 1.1f, moveSpeed: 2.0f), ActiveAbilityId = "ability_dash_zeph", AbilityElixirCost = 2 },
        };

        public static readonly IReadOnlyList<EvolutionRosterEntry> Evolutions = new List<EvolutionRosterEntry>
        {
            new EvolutionRosterEntry { Id = "evo_vanguard_recruit", BaseCardId = "troop_vanguard_recruit", EvolutionName = "Vanguard Recruit (Hardened)", Description = "Veterans of a dozen skirmishes; they go down swinging.", BonusAbilityId = "ability_death_shock", StatBonusPercent = 0.15f, ShardsRequired = 20 },
            new EvolutionRosterEntry { Id = "evo_longbow_skirmisher", BaseCardId = "troop_longbow_skirmisher", EvolutionName = "Longbow Skirmisher (Honed)", Description = "Fletched with rift-glass heads that punch through a second target.", BonusAbilityId = "ability_pierce", StatBonusPercent = 0.10f, ShardsRequired = 20 },
        };

        public static IEnumerable<string> AllCardIds =>
            Troops.Select(t => t.Id)
                .Concat(Buildings.Select(b => b.Id))
                .Concat(Spells.Select(s => s.Id))
                .Concat(Champions.Select(c => c.Id));
    }
}
