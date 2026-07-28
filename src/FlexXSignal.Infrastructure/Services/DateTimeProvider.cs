using FlexXSignal.Application.Common.Interfaces;

namespace FlexXSignal.Infrastructure.Services;

public sealed class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}
