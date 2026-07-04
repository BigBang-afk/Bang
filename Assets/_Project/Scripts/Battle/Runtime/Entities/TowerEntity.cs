namespace RoyaleClash.Battle
{
    public sealed class TowerEntity : BattleEntity
    {
        public override EntityKind Kind => EntityKind.Tower;

        public TowerBlueprint Blueprint;

        /// <summary>Only meaningful for Princess towers; King towers sit on the centerline.</summary>
        public Lane Lane;
        public bool CrownAwarded;
    }
}
