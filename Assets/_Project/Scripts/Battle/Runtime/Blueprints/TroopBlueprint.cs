using System;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Baked, level-scaled troop stats used directly by the simulation.</summary>
    public class TroopBlueprint
    {
        public CardId Id;
        public int ElixirCost;
        public UnitDomain Domain;
        public TargetMask CanTarget;
        public Fix64 MaxHealth;
        public Fix64 Damage;
        public Fix64 HitSpeedSeconds;
        public Fix64 MoveSpeed;
        public Fix64 Range;
        public Fix64 SightRange;
        public Fix64 DeployTimeSeconds;
        public int SpawnCount = 1;
        public Fix64 SplashRadius;
        public AbilityBlueprint[] PassiveAbilities = Array.Empty<AbilityBlueprint>();
        public EvolutionBlueprint Evolution;

        public bool HasSplash => SplashRadius > Fix64.Zero;
    }
}
