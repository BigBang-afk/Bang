using NUnit.Framework;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class Fix64Tests
    {
        [Test]
        public void Addition_IsExact()
        {
            Fix64 a = Fix64.FromInt(3);
            Fix64 b = Fix64.FromInt(4);
            Assert.AreEqual(7, (a + b).ToIntFloor());
        }

        [Test]
        public void Multiplication_MatchesExpectedValue()
        {
            Fix64 a = Fix64.FromFloat(2.5f);
            Fix64 b = Fix64.FromFloat(4f);
            Assert.AreEqual(10f, (a * b).ToFloat(), 0.001f);
        }

        [Test]
        public void Division_MatchesExpectedValue()
        {
            Fix64 a = Fix64.FromInt(10);
            Fix64 b = Fix64.FromInt(4);
            Assert.AreEqual(2.5f, (a / b).ToFloat(), 0.001f);
        }

        [Test]
        public void Sqrt_MatchesExpectedValue()
        {
            Fix64 value = Fix64.FromInt(16);
            Assert.AreEqual(4f, Fix64.Sqrt(value).ToFloat(), 0.01f);
        }

        [Test]
        public void Clamp_RespectsBounds()
        {
            Fix64 value = Fix64.FromInt(50);
            Fix64 clamped = Fix64.Clamp(value, Fix64.FromInt(0), Fix64.FromInt(10));
            Assert.AreEqual(10, clamped.ToIntFloor());
        }

        [Test]
        public void Lerp_HalfwayIsAverage()
        {
            Fix64 a = Fix64.FromInt(0);
            Fix64 b = Fix64.FromInt(10);
            Fix64 t = Fix64.Half;
            Assert.AreEqual(5f, Fix64.Lerp(a, b, t).ToFloat(), 0.001f);
        }
    }
}
