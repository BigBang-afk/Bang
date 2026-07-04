using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// The default, generic dual-lane arena layout: symmetric across the river, two bridges,
    /// a King tower and two Princess towers per side. Bespoke arena visuals/theme (Module 8)
    /// can vary art without changing this layout; a future per-arena layout override is a
    /// natural extension point but out of scope for the base simulation.
    /// </summary>
    public sealed class ArenaLayout
    {
        public static readonly ArenaLayout Default = new ArenaLayout();

        private static readonly Fix64 KingOffsetFromEdge = Fix64.FromInt(2);
        private static readonly Fix64 PrincessOffsetFromEdge = Fix64.FromFloat(6.5f);

        public Vector2Fix GetKingTowerPosition(PlayerSlot owner)
        {
            bool isBottom = owner.Value == 0;
            Fix64 y = isBottom ? KingOffsetFromEdge : BattleConstants.ArenaLengthTiles - KingOffsetFromEdge;
            return new Vector2Fix(BattleConstants.ArenaWidthTiles / Fix64.FromInt(2), y);
        }

        public Vector2Fix GetPrincessTowerPosition(PlayerSlot owner, Lane lane)
        {
            bool isBottom = owner.Value == 0;
            Fix64 y = isBottom ? PrincessOffsetFromEdge : BattleConstants.ArenaLengthTiles - PrincessOffsetFromEdge;
            Fix64 x = lane == Lane.Left ? BattleConstants.BridgeLeftX : BattleConstants.BridgeRightX;
            return new Vector2Fix(x, y);
        }

        public Vector2Fix GetBridgeCrossingPosition(Lane lane)
        {
            Fix64 x = lane == Lane.Left ? BattleConstants.BridgeLeftX : BattleConstants.BridgeRightX;
            return new Vector2Fix(x, BattleConstants.RiverY);
        }

        public Lane LaneForPosition(Vector2Fix position)
        {
            Fix64 center = BattleConstants.ArenaWidthTiles / Fix64.FromInt(2);
            return position.X < center ? Lane.Left : Lane.Right;
        }

        /// <summary>Whether a troop owned by <paramref name="owner"/> at <paramref name="position"/> is still on its own side of the river.</summary>
        public bool IsOnOwnSide(PlayerSlot owner, Vector2Fix position)
        {
            bool isBottom = owner.Value == 0;
            return isBottom ? position.Y < BattleConstants.RiverY : position.Y > BattleConstants.RiverY;
        }

        public bool IsWithinArenaBounds(Vector2Fix position)
        {
            return position.X >= Fix64.Zero && position.X <= BattleConstants.ArenaWidthTiles
                && position.Y >= Fix64.Zero && position.Y <= BattleConstants.ArenaLengthTiles;
        }
    }
}
