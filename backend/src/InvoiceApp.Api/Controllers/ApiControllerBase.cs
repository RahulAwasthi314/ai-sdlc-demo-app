using InvoiceApp.Api.Models;
using InvoiceApp.Domain;
using Microsoft.AspNetCore.Mvc;

namespace InvoiceApp.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Runs a service call and maps its failures to HTTP status codes with standard ApiErrorDto.</summary>
    protected ActionResult<Invoice> Handle(Func<Invoice> action)
    {
        try
        {
            return Ok(action());
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ApiErrorDto(ex.Message, "NOT_FOUND", 404));
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("The same user may never count as both approvers on one invoice", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new ApiErrorDto(ex.Message, "SAME_APPROVER_NOT_ALLOWED", 400));
            }

            if (ex.Message.Contains("Administrators are not authorized to decide invoices", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new ApiErrorDto(ex.Message, "ROLE_NOT_PERMITTED", 400));
            }

            return Conflict(new ApiErrorDto(ex.Message, "CONFLICT", 409));
        }
        catch (ApprovalLimitExceededException ex)
        {
            return BadRequest(new ApiErrorDto(ex.Message, "LIMIT_EXCEEDED", 400));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiErrorDto(ex.Message, "BAD_REQUEST", 400));
        }
    }
}
