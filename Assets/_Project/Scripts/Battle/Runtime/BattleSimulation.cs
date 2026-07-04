using System;
using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// Deterministic, server-authoritative 1v1 battle simulation. Plain C#, fixed-timestep,
    /// Fix64-based — no MonoBehaviour, no UnityEngine time/frame dependency. A host (local
    /// practice mode, or the Photon Fusion authoritative host in Module 4) calls
    /// <see cref="Tick"/> at a fixed rate; Unity-side view code subscribes to the events
    /// below and never mutates simulation state directly.
    /// </summary>
    public sealed partial class BattleSimulation
    {
        public MatchPhase Phase { get; private set; } = MatchPhase.PreMatch;
        public Fix64 Elapsed { get; private set; } = Fix64.Zero;
        public ArenaLayout Arena { get; } = ArenaLayout.Default;

        public event Action<BattleEntity> EntitySpawned;
        public event Action<BattleEntity> EntityDied;
        public event Action<BattleMatchResult> MatchEnded;

        private readonly PlayerSlot _playerA;
        private readonly PlayerSlot _playerB;
        private readonly BattleCardSet _cardSet;

        private readonly List<BattleEntity> _entities = new List<BattleEntity>();
        private readonly Dictionary<PlayerSlot, ElixirPool> _elixir = new Dictionary<PlayerSlot, ElixirPool>();
        private readonly Dictionary<PlayerSlot, int> _crowns = new Dictionary<PlayerSlot, int>();
        private readonly Dictionary<PlayerSlot, Fix64> _towerDamageDealt = new Dictionary<PlayerSlot, Fix64>();
        private readonly List<PendingSpellCast> _pendingSpells = new List<PendingSpellCast>();

        private int _nextEntityValue;

        public IReadOnlyList<BattleEntity> Entities => _entities;
        public BattleMatchResult Result { get; private set; } = BattleMatchResult.InProgress;

        public BattleSimulation(PlayerSlot playerA, PlayerSlot playerB, BattleCardSet cardSet)
        {
            _playerA = playerA;
            _playerB = playerB;
            _cardSet = cardSet;

            _elixir[playerA] = new ElixirPool(BattleConstants.StartingElixir, BattleConstants.MaxElixir, BattleConstants.NormalRegenSecondsPerElixir);
            _elixir[playerB] = new ElixirPool(BattleConstants.StartingElixir, BattleConstants.MaxElixir, BattleConstants.NormalRegenSecondsPerElixir);
            _crowns[playerA] = 0;
            _crowns[playerB] = 0;
            _towerDamageDealt[playerA] = Fix64.Zero;
            _towerDamageDealt[playerB] = Fix64.Zero;

            SpawnTower(playerA, TowerTier.King, Lane.Left);
            SpawnTower(playerA, TowerTier.Princess, Lane.Left);
            SpawnTower(playerA, TowerTier.Princess, Lane.Right);
            SpawnTower(playerB, TowerTier.King, Lane.Left);
            SpawnTower(playerB, TowerTier.Princess, Lane.Left);
            SpawnTower(playerB, TowerTier.Princess, Lane.Right);
        }

        public void Start()
        {
            if (Phase != MatchPhase.PreMatch) return;
            Phase = MatchPhase.Battle;
        }

        public ElixirPool GetElixir(PlayerSlot slot) => _elixir[slot];
        public int GetCrowns(PlayerSlot slot) => _crowns[slot];
        public Fix64 GetTowerDamageDealt(PlayerSlot slot) => _towerDamageDealt[slot];

        public PlayerSlot Opponent(PlayerSlot slot) => slot.Equals(_playerA) ? _playerB : _playerA;

        public void Tick(Fix64 dt)
        {
            if (Phase == MatchPhase.PreMatch || Phase == MatchPhase.Ended)
                return;

            Elapsed += dt;
            UpdatePhaseAndElixirRate();

            foreach (ElixirPool pool in _elixir.Values)
                pool.Tick(dt);

            TickBuildings(dt);
            TickPendingSpells(dt);
            TickStatusEffectsAndDamageOverTime(dt);

            var troops = _entities.OfType<TroopEntity>().ToList();
            MovementSystem.Tick(troops, Arena, dt, owner => Arena.GetKingTowerPosition(Opponent(owner)));

            AcquireAndResolveCombat(dt);
            ResolvePeriodicAbilities(dt);

            ProcessDeaths();
            CheckTimeExpiry();
        }

        private void UpdatePhaseAndElixirRate()
        {
            if (Phase == MatchPhase.Battle)
            {
                Fix64 rate = Elapsed >= BattleConstants.DoubleElixirStartSeconds
                    ? BattleConstants.NormalRegenSecondsPerElixir / BattleConstants.DoubleElixirDivisor
                    : BattleConstants.NormalRegenSecondsPerElixir;
                foreach (ElixirPool pool in _elixir.Values)
                    pool.SetRegenRate(rate);
            }
            else if (Phase == MatchPhase.Overtime)
            {
                Fix64 rate = BattleConstants.NormalRegenSecondsPerElixir / BattleConstants.TripleElixirDivisor;
                foreach (ElixirPool pool in _elixir.Values)
                    pool.SetRegenRate(rate);
            }
        }

        private EntityId NextEntityId() => new EntityId(_nextEntityValue++);

        private void RegisterEntity(BattleEntity entity)
        {
            _entities.Add(entity);
            EntitySpawned?.Invoke(entity);
        }

        private void SpawnTower(PlayerSlot owner, TowerTier tier, Lane lane)
        {
            TowerBlueprint blueprint = tier == TowerTier.King ? DefaultTowerBlueprints.King : DefaultTowerBlueprints.Princess;
            Vector2Fix position = tier == TowerTier.King ? Arena.GetKingTowerPosition(owner) : Arena.GetPrincessTowerPosition(owner, lane);

            var tower = new TowerEntity
            {
                Id = NextEntityId(),
                Owner = owner,
                Position = position,
                Health = blueprint.MaxHealth,
                MaxHealth = blueprint.MaxHealth,
                Blueprint = blueprint,
                Lane = lane,
            };
            RegisterEntity(tower);
        }

        internal TroopEntity SpawnTroop(PlayerSlot owner, TroopBlueprint blueprint, Vector2Fix position, ChampionBlueprint championBlueprint = null)
        {
            var troop = new TroopEntity
            {
                Id = NextEntityId(),
                Owner = owner,
                Position = position,
                Health = blueprint.MaxHealth,
                MaxHealth = blueprint.MaxHealth,
                Blueprint = blueprint,
                Lane = Arena.LaneForPosition(position),
                ChampionBlueprint = championBlueprint,
            };
            RegisterEntity(troop);
            return troop;
        }

        internal BuildingEntity SpawnBuilding(PlayerSlot owner, BuildingBlueprint blueprint, Vector2Fix position)
        {
            var building = new BuildingEntity
            {
                Id = NextEntityId(),
                Owner = owner,
                Position = position,
                Health = blueprint.MaxHealth,
                MaxHealth = blueprint.MaxHealth,
                Blueprint = blueprint,
                LifespanRemaining = blueprint.LifespanSeconds,
                SpawnTimerRemaining = blueprint.SpawnIntervalSeconds,
                ElixirGenTimerRemaining = Fix64.OneValue,
            };
            RegisterEntity(building);
            return building;
        }
    }
}
