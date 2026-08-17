using CafeGo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CafeGo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CafesController(
    GooglePlacesService googlePlaces)
    : ControllerBase
{
    // ============================================================
    // SEARCH
    // ============================================================

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string query,
        [FromQuery] string? pageToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(
                new
                {
                    message =
                        "Enter a city, neighborhood, or ZIP code."
                });
        }

        try
        {
            return Ok(
                await googlePlaces.Search(
                    query.Trim(),
                    pageToken,
                    cancellationToken));
        }
        catch (Exception ex)
        {
            return Problem(
                ex.Message,
                statusCode: 502);
        }
    }


    // ============================================================
    // AUTOCOMPLETE
    // ============================================================

    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete(
        [FromQuery] string input,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return Ok(
                new
                {
                    suggestions =
                        Array.Empty<object>()
                });
        }

        try
        {
            return Ok(
                await googlePlaces.Autocomplete(
                    input.Trim(),
                    cancellationToken));
        }
        catch (Exception ex)
        {
            return Problem(
                ex.Message,
                statusCode: 502);
        }
    }


    // ============================================================
    // NEARBY
    // ============================================================

    [HttpGet("nearby")]
    public async Task<IActionResult> Nearby(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] string? pageToken,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(
                await googlePlaces.Nearby(
                    lat,
                    lng,
                    pageToken,
                    cancellationToken));
        }
        catch (Exception ex)
        {
            return Problem(
                ex.Message,
                statusCode: 502);
        }
    }


    // ============================================================
    // PHOTO
    // ============================================================

    [HttpGet("photo")]
    [ResponseCache(
        NoStore = true,
        Location =
            ResponseCacheLocation.None)]
    public async Task<IActionResult> Photo(
        [FromQuery] string name,
        [FromQuery] int maxWidth = 1200,
        [FromQuery] int maxHeight = 800,
        CancellationToken cancellationToken = default)
    {
        try
        {
            Response.Headers.CacheControl =
                "no-store";

            return Redirect(
                await googlePlaces.Photo(
                    name,
                    maxWidth,
                    maxHeight,
                    cancellationToken));
        }
        catch
        {
            return NotFound();
        }
    }


    // ============================================================
    // DETAIL
    // ============================================================

    [HttpGet("{id}")]
    public async Task<IActionResult> Detail(
        string id,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(
                await googlePlaces.Detail(
                    id,
                    cancellationToken));
        }
        catch (Exception ex)
        {
            return Problem(
                ex.Message,
                statusCode: 502);
        }
    }
}