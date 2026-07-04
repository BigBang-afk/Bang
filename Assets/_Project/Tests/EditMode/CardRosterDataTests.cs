using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using RoyaleClash.Cards;

namespace RoyaleClash.Tests.EditMode
{
    public class CardRosterDataTests
    {
        [Test]
        public void AllCardIds_AreUnique()
        {
            List<string> ids = DefaultCardRosterData.AllCardIds.ToList();
            Assert.AreEqual(ids.Count, ids.Distinct().Count(), "Duplicate card id found in the roster.");
        }

        [Test]
        public void RosterHasAMeaningfulNumberOfCards()
        {
            Assert.GreaterOrEqual(DefaultCardRosterData.AllCardIds.Count(), 25);
        }

        [Test]
        public void AllCards_HaveElixirCostInValidRange()
        {
            IEnumerable<int> costs = DefaultCardRosterData.Troops.Select(t => t.Elixir)
                .Concat(DefaultCardRosterData.Buildings.Select(b => b.Elixir))
                .Concat(DefaultCardRosterData.Spells.Select(s => s.Elixir))
                .Concat(DefaultCardRosterData.Champions.Select(c => c.Elixir));

            foreach (int cost in costs)
                Assert.That(cost, Is.InRange(1, 9), "Elixir cost outside expected 1-9 range.");
        }

        [Test]
        public void AllAbilityReferences_ResolveToADefinedAbility()
        {
            var abilityIds = new HashSet<string>(DefaultCardRosterData.Abilities.Select(a => a.Id));

            foreach (TroopRosterEntry troop in DefaultCardRosterData.Troops)
                foreach (string abilityId in troop.AbilityIds)
                    Assert.Contains(abilityId, abilityIds, $"Troop '{troop.Id}' references unknown ability '{abilityId}'.");

            foreach (ChampionRosterEntry champion in DefaultCardRosterData.Champions)
                Assert.Contains(champion.ActiveAbilityId, abilityIds, $"Champion '{champion.Id}' references unknown ability '{champion.ActiveAbilityId}'.");

            foreach (EvolutionRosterEntry evolution in DefaultCardRosterData.Evolutions)
                if (!string.IsNullOrEmpty(evolution.BonusAbilityId))
                    Assert.Contains(evolution.BonusAbilityId, abilityIds, $"Evolution '{evolution.Id}' references unknown ability '{evolution.BonusAbilityId}'.");
        }

        [Test]
        public void AllEvolutions_ReferenceAnExistingTroop()
        {
            var troopIds = new HashSet<string>(DefaultCardRosterData.Troops.Select(t => t.Id));

            foreach (EvolutionRosterEntry evolution in DefaultCardRosterData.Evolutions)
                Assert.Contains(evolution.BaseCardId, troopIds, $"Evolution '{evolution.Id}' references unknown base card '{evolution.BaseCardId}'.");
        }

        [Test]
        public void TroopEvolutionId_MatchesAnEvolutionForThatTroop()
        {
            Dictionary<string, string> evolutionOwner = DefaultCardRosterData.Evolutions
                .ToDictionary(e => e.Id, e => e.BaseCardId);

            foreach (TroopRosterEntry troop in DefaultCardRosterData.Troops)
            {
                if (string.IsNullOrEmpty(troop.EvolutionId)) continue;

                Assert.IsTrue(evolutionOwner.TryGetValue(troop.EvolutionId, out string ownerId),
                    $"Troop '{troop.Id}' references unknown evolution '{troop.EvolutionId}'.");
                Assert.AreEqual(troop.Id, ownerId,
                    $"Evolution '{troop.EvolutionId}' is owned by '{ownerId}', not '{troop.Id}'.");
            }
        }

        [Test]
        public void BuildingSpawnReferences_ResolveToAnExistingTroop()
        {
            var troopIds = new HashSet<string>(DefaultCardRosterData.Troops.Select(t => t.Id));

            foreach (BuildingRosterEntry building in DefaultCardRosterData.Buildings)
                if (!string.IsNullOrEmpty(building.SpawnsTroopCardId))
                    Assert.Contains(building.SpawnsTroopCardId, troopIds, $"Building '{building.Id}' spawns unknown troop '{building.SpawnsTroopCardId}'.");
        }
    }
}
