using System.Net;
using System.Text.Json;
using FluentValidation;

namespace FlexXSignal.Api.Middleware;

/// <summary>Global exception handler: converts unhandled exceptions into a safe, uniform JSON error
/// response and never leaks stack traces, connection strings, or other internals to the client.</summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";
            var errors = ex.Errors.Select(e => e.ErrorMessage);
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { errors }));
        }
        catch (UnauthorizedAccessException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
        }
        catch (Exception ex)
        {
            var correlationId = context.Items.TryGetValue("CorrelationId", out var id) ? id?.ToString() : context.TraceIdentifier;
            _logger.LogError(ex, "Unhandled exception. CorrelationId: {CorrelationId}", correlationId);

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "An unexpected error occurred. Please try again or contact support.",
                correlationId
            }));
        }
    }
}
