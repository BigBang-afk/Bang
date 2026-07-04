using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Pure win/draw determination, independent of the live simulation so it's easy to unit test.</summary>
    public static class WinConditionEvaluator
    {
        /// <summary>Called at time expiry (end of Battle or Overtime phase) — most crowns wins; equal crowns compares total tower damage dealt; still equal is a draw.</summary>
        public static BattleMatchResult EvaluateAtTimeExpiry(
            PlayerSlot playerA, int crownsA, Fix64 towerDamageA,
            PlayerSlot playerB, int crownsB, Fix64 towerDamageB)
        {
            if (crownsA != crownsB)
                return BattleMatchResult.Decisive(crownsA > crownsB ? playerA : playerB, "Most crowns at time expiry.");

            if (towerDamageA != towerDamageB)
                return BattleMatchResult.Decisive(towerDamageA > towerDamageB ? playerA : playerB, "Tiebreak: most total tower damage dealt.");

            return BattleMatchResult.Draw("Equal crowns and tower damage.");
        }
    }
}
