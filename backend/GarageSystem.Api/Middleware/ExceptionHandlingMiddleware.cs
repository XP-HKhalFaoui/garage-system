using GarageSystem.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace GarageSystem.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception non gérée: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (status, title) = ex switch
        {
            NotFoundException     => (StatusCodes.Status404NotFound,              "Ressource introuvable"),
            BusinessRuleException => (StatusCodes.Status422UnprocessableEntity,   "Règle métier violée"),
            ConflictException     => (StatusCodes.Status409Conflict,              "Conflit de données"),
            _                     => (StatusCodes.Status500InternalServerError,   "Erreur interne du serveur")
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = _env.IsDevelopment() ? ex.Message : "Une erreur s'est produite.",
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = status;

        return context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
