using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed class TroopEntity : BattleEntity
    {
        public override EntityKind Kind => EntityKind.Troop;

        public TroopBlueprint Blueprint;
        public Lane Lane;
        public bool HasCrossedRiver;

        /// <summary>Shared timer for this troop's one periodic passive ability (summon/haste pulse), if it has one.</summary>
        public Fix64 AbilityCooldownRemaining;

        /// <summary>Only set for Champion troops; null for ordinary troops.</summary>
        public ChampionBlueprint ChampionBlueprint;
        public bool IsChampion => ChampionBlueprint != null;
    }
}
