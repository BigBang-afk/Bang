using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking
{
    /// <summary>
    /// The single interface Module 7 (UI) drives a battle through, whichever mode it is:
    /// <see cref="PracticeMatchHost"/> for local practice/AI, or the Fusion-backed networked
    /// host (Networking/Runtime/Fusion, compiled once Photon Fusion 2 is imported — see
    /// docs/NETWORKING.md) for real PvP. Request methods never mutate state directly; they
    /// forward to whichever BattleSimulation actually holds authority and return its result.
    /// </summary>
    public interface IMatchHost : IBattleView
    {
        MatchMode Mode { get; }
        PlayerSlot LocalPlayerSlot { get; }

        GameResult RequestDeployTroop(CardId cardId, Vector2Fix position);
        GameResult RequestDeployBuilding(CardId cardId, Vector2Fix position);
        GameResult RequestCastSpell(CardId cardId, Vector2Fix position);
        GameResult RequestActivateChampionAbility(EntityId championEntityId);

        /// <summary>Advances the local simulation for Practice mode; a no-op for networked hosts, where the State Authority ticks independently.</summary>
        void Tick(Fix64 dt);
    }
}
