using InvoiceApp.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace InvoiceApp.Api.Auth;

/// <summary>Allows the action only for the listed roles; everyone else gets 403 with ApiErrorDto.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireRoleAttribute : ActionFilterAttribute
{
    private readonly string[] _roles;

    public RequireRoleAttribute(params string[] roles)
    {
        _roles = roles;
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var session = context.HttpContext.Items[HttpContextExtensions.SessionKey] as UserSession;

        if (session is null || !_roles.Contains(session.Role))
        {
            context.Result = new ObjectResult(new ApiErrorDto("Forbidden: Insufficient role permissions.", "FORBIDDEN", StatusCodes.Status403Forbidden))
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
