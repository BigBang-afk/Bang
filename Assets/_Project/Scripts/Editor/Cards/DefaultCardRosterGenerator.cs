using System.Collections.Generic;
using System.IO;
using RoyaleClash.Cards;
using UnityEditor;
using UnityEngine;

namespace RoyaleClash.EditorTools.Cards
{
    /// <summary>
    /// Materializes the plain-data roster in <see cref="DefaultCardRosterData"/> into real
    /// CardDefinition/AbilityDefinition/EvolutionDefinition ScriptableObject assets under
    /// Assets/_Project/Data/Cards. Safe to re-run: existing assets at the expected path are
    /// updated in place rather than duplicated, so re-running after editing the data table
    /// (or after an artist assigns a Prefab/Icon) never loses those manual assignments.
    /// </summary>
    public static class DefaultCardRosterGenerator
    {
        private const string CardsFolder = "Assets/_Project/Data/Cards";
        private const string AbilitiesFolder = "Assets/_Project/Data/Cards/Abilities";
        private const string EvolutionsFolder = "Assets/_Project/Data/Cards/Evolutions";

        [MenuItem("Royale Clash/Cards/Generate Default Card Roster")]
        public static void Generate()
        {
            EnsureFolder(CardsFolder);
            EnsureFolder(AbilitiesFolder);
            EnsureFolder(EvolutionsFolder);
            EnsureLevelCurve();

            var abilities = new Dictionary<string, AbilityDefinition>();
            foreach (AbilityRosterEntry entry in DefaultCardRosterData.Abilities)
                abilities[entry.Id] = CreateOrUpdateAbility(entry);

            var evolutions = new Dictionary<string, EvolutionDefinition>();
            foreach (EvolutionRosterEntry entry in DefaultCardRosterData.Evolutions)
                evolutions[entry.Id] = CreateOrUpdateEvolution(entry, abilities);

            foreach (TroopRosterEntry entry in DefaultCardRosterData.Troops)
                CreateOrUpdateTroop(entry, abilities, evolutions);

            foreach (BuildingRosterEntry entry in DefaultCardRosterData.Buildings)
                CreateOrUpdateBuilding(entry);

            foreach (SpellRosterEntry entry in DefaultCardRosterData.Spells)
                CreateOrUpdateSpell(entry);

            foreach (ChampionRosterEntry entry in DefaultCardRosterData.Champions)
                CreateOrUpdateChampion(entry, abilities);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            CardDatabaseBuilder.Rebuild();

            Debug.Log("Royale Clash: default card roster generated/updated.");
        }

        private static void EnsureLevelCurve()
        {
            string path = $"{CardsFolder}/CardLevelCurve.asset";
            if (AssetDatabase.LoadAssetAtPath<CardLevelCurve>(path) != null)
                return;

            var curve = ScriptableObject.CreateInstance<CardLevelCurve>();
            AssetDatabase.CreateAsset(curve, path);
        }

        private static AbilityDefinition CreateOrUpdateAbility(AbilityRosterEntry entry)
        {
            string path = $"{AbilitiesFolder}/{entry.Id}.asset";
            var ability = LoadOrCreate<AbilityDefinition>(path);
            ability.AbilityId = entry.Id;
            ability.DisplayName = entry.DisplayName;
            ability.Description = entry.Description;
            ability.Code = entry.Code;
            ability.AppliesEffect = entry.Effect;
            ability.Magnitude = entry.Magnitude;
            ability.DurationSeconds = entry.Duration;
            ability.RadiusTiles = entry.Radius;
            ability.CooldownSeconds = entry.Cooldown;
            ability.ElixirCostToActivate = entry.ElixirCost;
            EditorUtility.SetDirty(ability);
            return ability;
        }

        private static EvolutionDefinition CreateOrUpdateEvolution(EvolutionRosterEntry entry, Dictionary<string, AbilityDefinition> abilities)
        {
            string path = $"{EvolutionsFolder}/{entry.Id}.asset";
            var evolution = LoadOrCreate<EvolutionDefinition>(path);
            evolution.EvolutionName = entry.EvolutionName;
            evolution.Description = entry.Description;
            evolution.StatBonusPercent = entry.StatBonusPercent;
            evolution.ShardsRequired = entry.ShardsRequired;
            evolution.BonusAbility = ResolveAbility(entry.BonusAbilityId, abilities);
            EditorUtility.SetDirty(evolution);
            return evolution;
        }

        private static void CreateOrUpdateTroop(TroopRosterEntry entry, Dictionary<string, AbilityDefinition> abilities, Dictionary<string, EvolutionDefinition> evolutions)
        {
            string path = $"{CardsFolder}/{entry.Id}.asset";
            var troop = LoadOrCreate<TroopDefinition>(path);
            troop.CardIdValue = entry.Id;
            troop.DisplayName = entry.Name;
            troop.Lore = entry.Lore;
            troop.Rarity = entry.Rarity;
            troop.ElixirCost = entry.Elixir;
            troop.Domain = entry.Domain;
            troop.CanTarget = entry.CanTarget;
            troop.BaseStats = entry.Stats;
            troop.PassiveAbilities = ResolveAbilities(entry.AbilityIds, abilities);
            troop.Evolution = string.IsNullOrEmpty(entry.EvolutionId) ? null
                : evolutions.TryGetValue(entry.EvolutionId, out var evo) ? evo : null;
            EditorUtility.SetDirty(troop);
        }

        private static void CreateOrUpdateBuilding(BuildingRosterEntry entry)
        {
            string path = $"{CardsFolder}/{entry.Id}.asset";
            var building = LoadOrCreate<BuildingDefinition>(path);
            building.CardIdValue = entry.Id;
            building.DisplayName = entry.Name;
            building.Lore = entry.Lore;
            building.Rarity = entry.Rarity;
            building.ElixirCost = entry.Elixir;
            building.CanTarget = entry.CanTarget;
            building.BaseStats = entry.Stats;
            building.LifespanSeconds = entry.LifespanSeconds;
            building.SpawnsTroopCardId = entry.SpawnsTroopCardId;
            building.SpawnIntervalSeconds = entry.SpawnIntervalSeconds;
            building.BonusElixirGenerated = entry.BonusElixirGenerated;
            EditorUtility.SetDirty(building);
        }

        private static void CreateOrUpdateSpell(SpellRosterEntry entry)
        {
            string path = $"{CardsFolder}/{entry.Id}.asset";
            var spell = LoadOrCreate<SpellDefinition>(path);
            spell.CardIdValue = entry.Id;
            spell.DisplayName = entry.Name;
            spell.Lore = entry.Lore;
            spell.Rarity = entry.Rarity;
            spell.ElixirCost = entry.Elixir;
            spell.RadiusTiles = entry.RadiusTiles;
            spell.BaseDamage = entry.BaseDamage;
            spell.AffectsTargets = entry.AffectsTargets;
            spell.Effect = entry.Effect;
            spell.EffectMagnitude = entry.EffectMagnitude;
            spell.EffectDurationSeconds = entry.EffectDurationSeconds;
            spell.DelaySeconds = entry.DelaySeconds;
            EditorUtility.SetDirty(spell);
        }

        private static void CreateOrUpdateChampion(ChampionRosterEntry entry, Dictionary<string, AbilityDefinition> abilities)
        {
            string path = $"{CardsFolder}/{entry.Id}.asset";
            var champion = LoadOrCreate<ChampionDefinition>(path);
            champion.CardIdValue = entry.Id;
            champion.DisplayName = entry.Name;
            champion.Lore = entry.Lore;
            champion.Rarity = CardRarity.Champion;
            champion.ElixirCost = entry.Elixir;
            champion.Domain = entry.Domain;
            champion.CanTarget = entry.CanTarget;
            champion.BaseStats = entry.Stats;
            champion.ActiveAbility = ResolveAbility(entry.ActiveAbilityId, abilities);
            champion.AbilityElixirCost = entry.AbilityElixirCost;
            EditorUtility.SetDirty(champion);
        }

        private static AbilityDefinition ResolveAbility(string id, Dictionary<string, AbilityDefinition> abilities)
            => !string.IsNullOrEmpty(id) && abilities.TryGetValue(id, out var ability) ? ability : null;

        private static AbilityDefinition[] ResolveAbilities(string[] ids, Dictionary<string, AbilityDefinition> abilities)
        {
            if (ids == null || ids.Length == 0) return System.Array.Empty<AbilityDefinition>();
            var result = new List<AbilityDefinition>(ids.Length);
            foreach (string id in ids)
            {
                var resolved = ResolveAbility(id, abilities);
                if (resolved != null) result.Add(resolved);
            }
            return result.ToArray();
        }

        private static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null) return existing;

            var instance = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(instance, path);
            return instance;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;

            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            string leaf = Path.GetFileName(path);
            if (!string.IsNullOrEmpty(parent) && !AssetDatabase.IsValidFolder(parent))
                EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, leaf);
        }
    }
}
