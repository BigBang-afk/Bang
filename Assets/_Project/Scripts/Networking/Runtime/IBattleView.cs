using System;
using System.Collections.Generic;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking
{
    /// <summary>Read-only feed of match state — everything the UI/rendering layer needs, regardless of whether it's backed by a local simulation or a networked mirror.</summary>
    public interface IBattleView
    {
        MatchPhase Phase { get; }
        BattleMatchResult Result { get; }
        IReadOnlyList<BattleEntitySnapshot> EntitySnapshots { get; }
        Fix64 GetElixir(PlayerSlot slot);
        int GetCrowns(PlayerSlot slot);

        event Action<BattleEntitySnapshot> EntitySpawned;
        event Action<BattleEntitySnapshot> EntityDied;
        event Action<BattleMatchResult> MatchEnded;
    }
}
