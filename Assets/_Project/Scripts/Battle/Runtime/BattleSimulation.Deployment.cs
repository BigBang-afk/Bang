using System.Linq;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed partial class BattleSimulation
    {
        public GameResult TryDeployTroop(PlayerSlot owner, CardId cardId, Vector2Fix position)
        {
            if (_cardSet.TryGetChampion(cardId, out ChampionBlueprint champion))
                return DeployTroopInternal(owner, champion, champion.ElixirCost, position, champion);

            if (_cardSet.TryGetTroop(cardId, out TroopBlueprint troop))
                return DeployTroopInternal(owner, troop, troop.ElixirCost, position, null);

            return GameResult.Fail($"Unknown troop card '{cardId}'.");
        }

        private GameResult DeployTroopInternal(PlayerSlot owner, TroopBlueprint blueprint, int elixirCost, Vector2Fix position, ChampionBlueprint championBlueprint)
        {
            GameResult validation = ValidateDeploy(owner, position, elixirCost);
            if (!validation.Success) return validation;

            _elixir[owner].TrySpend(Fix64.FromInt(elixirCost));

            int count = blueprint.SpawnCount;
            for (int i = 0; i < count; i++)
            {
                Vector2Fix offset = SpawnFormationOffset(i, count);
                SpawnTroop(owner, blueprint, position + offset, championBlueprint);
            }

            return GameResult.Successful;
        }

        public GameResult TryDeployBuilding(PlayerSlot owner, CardId cardId, Vector2Fix position)
        {
            if (!_cardSet.TryGetBuilding(cardId, out BuildingBlueprint blueprint))
                return GameResult.Fail($"Unknown building card '{cardId}'.");

            GameResult validation = ValidateDeploy(owner, position, blueprint.ElixirCost);
            if (!validation.Success) return validation;

            _elixir[owner].TrySpend(Fix64.FromInt(blueprint.ElixirCost));
            SpawnBuilding(owner, blueprint, position);
            return GameResult.Successful;
        }

        public GameResult TryCastSpell(PlayerSlot owner, CardId cardId, Vector2Fix position)
        {
            if (!_cardSet.TryGetSpell(cardId, out SpellBlueprint blueprint))
                return GameResult.Fail($"Unknown spell card '{cardId}'.");

            if (!Arena.IsWithinArenaBounds(position))
                return GameResult.Fail("Target position is outside the arena.");

            Fix64 cost = Fix64.FromInt(blueprint.ElixirCost);
            if (!_elixir[owner].TrySpend(cost))
                return GameResult.Fail("Not enough Elixir.");

            if (blueprint.DelaySeconds > Fix64.Zero)
                _pendingSpells.Add(new PendingSpellCast { Caster = owner, Blueprint = blueprint, Position = position, RemainingDelay = blueprint.DelaySeconds });
            else
                ResolveSpell(owner, blueprint, position);

            return GameResult.Successful;
        }

        public GameResult TryActivateChampionAbility(PlayerSlot owner, EntityId championEntityId)
        {
            TroopEntity champion = _entities.OfType<TroopEntity>()
                .FirstOrDefault(t => t.Id == championEntityId && t.Owner.Equals(owner) && t.IsChampion && t.IsAlive);

            if (champion == null)
                return GameResult.Fail("No active champion found for that entity id.");

            AbilityBlueprint ability = champion.ChampionBlueprint.ActiveAbility;
            if (ability == null)
                return GameResult.Fail("This champion has no active ability.");

            Fix64 cost = Fix64.FromInt(champion.ChampionBlueprint.AbilityElixirCost);
            if (!_elixir[owner].TrySpend(cost))
                return GameResult.Fail("Not enough Elixir.");

            ExecuteAbilityOnActivate(champion, ability);
            return GameResult.Successful;
        }

        private GameResult ValidateDeploy(PlayerSlot owner, Vector2Fix position, int elixirCost)
        {
            if (Phase != MatchPhase.Battle && Phase != MatchPhase.Overtime)
                return GameResult.Fail("Cannot deploy outside of an active match.");

            if (!Arena.IsWithinArenaBounds(position))
                return GameResult.Fail("Deploy position is outside the arena.");

            if (!Arena.IsOnOwnSide(owner, position))
                return GameResult.Fail("Cannot deploy on the opponent's side of the river.");

            if (_elixir[owner].Current < Fix64.FromInt(elixirCost))
                return GameResult.Fail("Not enough Elixir.");

            return GameResult.Successful;
        }

        private static Vector2Fix SpawnFormationOffset(int index, int count)
        {
            if (count <= 1) return Vector2Fix.Zero;

            Fix64 spacing = Fix64.FromFloat(0.6f);
            Fix64 startOffset = spacing * Fix64.FromInt(count - 1) / Fix64.FromInt(2);
            Fix64 x = spacing * Fix64.FromInt(index) - startOffset;
            return new Vector2Fix(x, Fix64.Zero);
        }
    }
}
