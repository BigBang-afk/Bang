using System;
using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking
{
    /// <summary>
    /// A minimal heuristic bot for Practice/Training modes: on a fixed cadence, deploys a
    /// random affordable troop near its own default lane spot. This is not a ranked-quality
    /// AI difficulty ladder — just enough opposition to make solo practice/training useful.
    /// A smarter opponent (deck-aware counters, lane pressure reading) is a natural future
    /// addition here without touching anything else in this module.
    /// </summary>
    public sealed class SimpleAiOpponent
    {
        private readonly BattleSimulation _simulation;
        private readonly PlayerSlot _slot;
        private readonly BattleCardSet _cardSet;
        private readonly Random _random = new Random();
        private Fix64 _decisionCooldown = Fix64.FromInt(2);

        public SimpleAiOpponent(BattleSimulation simulation, PlayerSlot slot, BattleCardSet cardSet)
        {
            _simulation = simulation;
            _slot = slot;
            _cardSet = cardSet;
        }

        public void Tick(Fix64 dt)
        {
            if (_simulation.Phase != MatchPhase.Battle && _simulation.Phase != MatchPhase.Overtime)
                return;

            _decisionCooldown -= dt;
            if (_decisionCooldown > Fix64.Zero) return;
            _decisionCooldown = Fix64.FromFloat(1.5f);

            Fix64 available = _simulation.GetElixir(_slot).Current;
            List<TroopBlueprint> affordable = _cardSet.AllTroops.Where(t => available >= Fix64.FromInt(t.ElixirCost)).ToList();
            if (affordable.Count == 0) return;

            TroopBlueprint chosen = affordable[_random.Next(affordable.Count)];
            _simulation.TryDeployTroop(_slot, chosen.Id, DefaultDeployPosition());
        }

        private Vector2Fix DefaultDeployPosition()
        {
            Fix64 x = _random.Next(2) == 0 ? BattleConstants.BridgeLeftX : BattleConstants.BridgeRightX;
            bool isBottom = _slot.Value == 0;
            Fix64 y = isBottom ? Fix64.FromInt(6) : BattleConstants.ArenaLengthTiles - Fix64.FromInt(6);
            return new Vector2Fix(x, y);
        }
    }
}
