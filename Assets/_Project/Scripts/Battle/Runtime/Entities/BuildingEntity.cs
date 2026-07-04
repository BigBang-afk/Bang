using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed class BuildingEntity : BattleEntity
    {
        public override EntityKind Kind => EntityKind.Building;

        public BuildingBlueprint Blueprint;
        public Fix64 LifespanRemaining;
        public Fix64 SpawnTimerRemaining;
        public Fix64 ElixirGenTimerRemaining;
    }
}
