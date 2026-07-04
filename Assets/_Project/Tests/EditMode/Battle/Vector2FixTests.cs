using NUnit.Framework;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class Vector2FixTests
    {
        [Test]
        public void Distance_MatchesPythagoras()
        {
            var a = new Vector2Fix(Fix64.Zero, Fix64.Zero);
            var b = new Vector2Fix(Fix64.FromInt(3), Fix64.FromInt(4));
            Assert.AreEqual(5f, Vector2Fix.Distance(a, b).ToFloat(), 0.001f);
        }

        [Test]
        public void MoveTowards_StopsExactlyAtTargetWhenCloserThanDelta()
        {
            var current = new Vector2Fix(Fix64.Zero, Fix64.Zero);
            var target = new Vector2Fix(Fix64.FromInt(1), Fix64.Zero);
            Vector2Fix result = Vector2Fix.MoveTowards(current, target, Fix64.FromInt(5));
            Assert.AreEqual(1f, result.X.ToFloat(), 0.001f);
        }

        [Test]
        public void MoveTowards_MovesPartwayWhenFartherThanDelta()
        {
            var current = new Vector2Fix(Fix64.Zero, Fix64.Zero);
            var target = new Vector2Fix(Fix64.FromInt(10), Fix64.Zero);
            Vector2Fix result = Vector2Fix.MoveTowards(current, target, Fix64.FromInt(2));
            Assert.AreEqual(2f, result.X.ToFloat(), 0.001f);
        }

        [Test]
        public void Normalized_HasUnitLength()
        {
            var v = new Vector2Fix(Fix64.FromInt(3), Fix64.FromInt(4));
            Vector2Fix n = v.Normalized();
            Assert.AreEqual(1f, n.Magnitude.ToFloat(), 0.01f);
        }
    }
}
