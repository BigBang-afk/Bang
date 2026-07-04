using RoyaleClash.Core.Fixed;
using UnityEngine;

namespace RoyaleClash.Networking
{
    /// <summary>
    /// Conversions between the simulation's deterministic Fix64 types and Unity's float-based
    /// types. Used only at the networking/rendering boundary — the simulation itself (Battle
    /// module) never touches these, which is exactly why it stays deterministic.
    /// </summary>
    public static class FixConversions
    {
        public static Vector3 ToUnityVector3(this Vector2Fix v) => new Vector3(v.X.ToFloat(), 0f, v.Y.ToFloat());
        public static Vector2 ToUnityVector2(this Vector2Fix v) => new Vector2(v.X.ToFloat(), v.Y.ToFloat());
        public static Vector2Fix ToVector2Fix(this Vector3 v) => new Vector2Fix(Fix64.FromFloat(v.x), Fix64.FromFloat(v.z));
        public static Vector2Fix ToVector2Fix(this Vector2 v) => new Vector2Fix(Fix64.FromFloat(v.x), Fix64.FromFloat(v.y));
    }
}
