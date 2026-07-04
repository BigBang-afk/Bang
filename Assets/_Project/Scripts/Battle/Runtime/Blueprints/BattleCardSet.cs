using System.Collections.Generic;
using RoyaleClash.Cards;
using RoyaleClash.Core;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// The resolved set of blueprints available to a single match: both players' decks plus
    /// any troop a building might spawn. Built once at match setup (from a <see cref="CardDatabase"/>
    /// plus each player's <see cref="Deck"/> and card levels) so the simulation never has to
    /// touch ScriptableObjects mid-match.
    /// </summary>
    public sealed class BattleCardSet
    {
        private readonly Dictionary<CardId, TroopBlueprint> _troops = new Dictionary<CardId, TroopBlueprint>();
        private readonly Dictionary<CardId, BuildingBlueprint> _buildings = new Dictionary<CardId, BuildingBlueprint>();
        private readonly Dictionary<CardId, SpellBlueprint> _spells = new Dictionary<CardId, SpellBlueprint>();
        private readonly Dictionary<CardId, ChampionBlueprint> _champions = new Dictionary<CardId, ChampionBlueprint>();

        public void AddTroop(TroopBlueprint blueprint) => _troops[blueprint.Id] = blueprint;
        public void AddBuilding(BuildingBlueprint blueprint) => _buildings[blueprint.Id] = blueprint;
        public void AddSpell(SpellBlueprint blueprint) => _spells[blueprint.Id] = blueprint;
        public void AddChampion(ChampionBlueprint blueprint) => _champions[blueprint.Id] = blueprint;

        public bool TryGetTroop(CardId id, out TroopBlueprint blueprint) => _troops.TryGetValue(id, out blueprint);
        public bool TryGetBuilding(CardId id, out BuildingBlueprint blueprint) => _buildings.TryGetValue(id, out blueprint);
        public bool TryGetSpell(CardId id, out SpellBlueprint blueprint) => _spells.TryGetValue(id, out blueprint);
        public bool TryGetChampion(CardId id, out ChampionBlueprint blueprint) => _champions.TryGetValue(id, out blueprint);

        public IReadOnlyCollection<TroopBlueprint> AllTroops => _troops.Values;
        public IReadOnlyCollection<BuildingBlueprint> AllBuildings => _buildings.Values;
        public IReadOnlyCollection<SpellBlueprint> AllSpells => _spells.Values;
        public IReadOnlyCollection<ChampionBlueprint> AllChampions => _champions.Values;

        /// <summary>Builds a card set from every card in a database at level 1, for local practice/tests.</summary>
        public static BattleCardSet BuildFromDatabase(CardDatabase database, CardLevelCurve curve)
        {
            var set = new BattleCardSet();
            foreach (CardDefinition card in database.Cards)
            {
                switch (card)
                {
                    case ChampionDefinition champion:
                        set.AddChampion(BlueprintFactory.FromChampion(champion, 1, curve));
                        break;
                    case TroopDefinition troop:
                        set.AddTroop(BlueprintFactory.FromTroop(troop, 1, curve));
                        break;
                    case BuildingDefinition building:
                        set.AddBuilding(BlueprintFactory.FromBuilding(building, 1, curve));
                        break;
                    case SpellDefinition spell:
                        set.AddSpell(BlueprintFactory.FromSpell(spell, 1, curve));
                        break;
                }
            }
            return set;
        }
    }
}
