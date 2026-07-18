namespace ZarghoonJewellers.Common.Exceptions;

/// <summary>Thrown by the Business layer when an operation violates a domain rule
/// (e.g. selling more stock than is on hand, deleting a customer with an open balance).
/// The Presentation layer catches this specifically to show a friendly message instead
/// of a raw stack trace.</summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
    public BusinessRuleException(string message, Exception innerException) : base(message, innerException) { }
}
