using RoyaleClash.Core;

namespace RoyaleClash.Battle
{
    public readonly struct BattleMatchResult
    {
        public readonly MatchOutcome Outcome;
        public readonly PlayerSlot? Winner;
        public readonly string Reason;

        private BattleMatchResult(MatchOutcome outcome, PlayerSlot? winner, string reason)
        {
            Outcome = outcome;
            Winner = winner;
            Reason = reason;
        }

        public static readonly BattleMatchResult InProgress = new BattleMatchResult(MatchOutcome.InProgress, null, null);

        public static BattleMatchResult Decisive(PlayerSlot winner, string reason) =>
            new BattleMatchResult(MatchOutcome.Decisive, winner, reason);

        public static BattleMatchResult Draw(string reason) =>
            new BattleMatchResult(MatchOutcome.Draw, null, reason);
    }
}
