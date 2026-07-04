using System;
using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking
{
    /// <summary>
    /// Fully local match host for Practice/Training/AI Battle — no networking at all. Owns a
    /// real <see cref="BattleSimulation"/> directly, so there is zero round-trip latency.
    /// Whatever drives the game loop (a MonoBehaviour in Module 7) calls <see cref="Tick"/>
    /// once per fixed step.
    /// </summary>
    public sealed class PracticeMatchHost : IMatchHost
    {
        public MatchMode Mode => MatchMode.Practice;
        public PlayerSlot LocalPlayerSlot { get; }

        private readonly BattleSimulation _simulation;
        private readonly SimpleAiOpponent _ai;

        public event Action<BattleEntitySnapshot> EntitySpawned;
        public event Action<BattleEntitySnapshot> EntityDied;
        public event Action<BattleMatchResult> MatchEnded;

        public PracticeMatchHost(BattleCardSet cardSet, PlayerSlot localSlot, PlayerSlot opponentSlot, bool opponentIsAi = true)
        {
            LocalPlayerSlot = localSlot;

            _simulation = new BattleSimulation(localSlot, opponentSlot, cardSet);
            _simulation.EntitySpawned += e => EntitySpawned?.Invoke(BattleEntitySnapshot.FromEntity(e));
            _simulation.EntityDied += e => EntityDied?.Invoke(BattleEntitySnapshot.FromEntity(e));
            _simulation.MatchEnded += r => MatchEnded?.Invoke(r);
            _simulation.Start();

            if (opponentIsAi)
                _ai = new SimpleAiOpponent(_simulation, opponentSlot, cardSet);
        }

        public MatchPhase Phase => _simulation.Phase;
        public BattleMatchResult Result => _simulation.Result;
        public IReadOnlyList<BattleEntitySnapshot> EntitySnapshots => _simulation.Entities.Select(BattleEntitySnapshot.FromEntity).ToList();

        public Fix64 GetElixir(PlayerSlot slot) => _simulation.GetElixir(slot).Current;
        public int GetCrowns(PlayerSlot slot) => _simulation.GetCrowns(slot);

        public GameResult RequestDeployTroop(CardId cardId, Vector2Fix position) => _simulation.TryDeployTroop(LocalPlayerSlot, cardId, position);
        public GameResult RequestDeployBuilding(CardId cardId, Vector2Fix position) => _simulation.TryDeployBuilding(LocalPlayerSlot, cardId, position);
        public GameResult RequestCastSpell(CardId cardId, Vector2Fix position) => _simulation.TryCastSpell(LocalPlayerSlot, cardId, position);
        public GameResult RequestActivateChampionAbility(EntityId championEntityId) => _simulation.TryActivateChampionAbility(LocalPlayerSlot, championEntityId);

        public void Tick(Fix64 dt)
        {
            _simulation.Tick(dt);
            _ai?.Tick(dt);
        }
    }
}
