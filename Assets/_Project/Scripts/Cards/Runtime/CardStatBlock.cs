using System;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// Base (tournament-standard, level 1) stats for a troop or building. Authored as float
    /// here for designer readability; the Battle simulation converts to Fix64 on load so the
    /// running match is deterministic.
    /// </summary>
    [Serializable]
    public struct CardStatBlock
    {
        public int Health;
        public int Damage;
        public float HitSpeedSeconds;
        public float MoveSpeedTilesPerSecond;
        public float RangeTiles;
        public float SightRangeTiles;
        public float DeployTimeSeconds;
        public int SpawnCount;
        public float SplashRadiusTiles;

        public static CardStatBlock Melee(int health, int damage, float hitSpeed, float moveSpeed, int spawnCount = 1)
            => new CardStatBlock
            {
                Health = health,
                Damage = damage,
                HitSpeedSeconds = hitSpeed,
                MoveSpeedTilesPerSecond = moveSpeed,
                RangeTiles = 1f,
                SightRangeTiles = 5.5f,
                DeployTimeSeconds = 1f,
                SpawnCount = spawnCount,
                SplashRadiusTiles = 0f,
            };

        public static CardStatBlock Ranged(int health, int damage, float hitSpeed, float moveSpeed, float range, int spawnCount = 1, float splash = 0f)
            => new CardStatBlock
            {
                Health = health,
                Damage = damage,
                HitSpeedSeconds = hitSpeed,
                MoveSpeedTilesPerSecond = moveSpeed,
                RangeTiles = range,
                SightRangeTiles = Math.Max(range + 1.5f, 5.5f),
                DeployTimeSeconds = 1f,
                SpawnCount = spawnCount,
                SplashRadiusTiles = splash,
            };
    }
}
