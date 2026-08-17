using System.Net.Http.Json;
using System.Text.Json;

namespace CafeGo.Api.Services;

public sealed class GooglePlacesService(
    HttpClient http,
    IConfiguration config)
{
    private const string BaseUrl =
        "https://places.googleapis.com/v1";

    private string ApiKey =>
        config["GooglePlaces:ApiKey"] ?? "";

    private void CheckApiKey()
    {
        if (string.IsNullOrWhiteSpace(ApiKey))
        {
            throw new Exception(
                "Google Places API key is missing. Configure GooglePlaces:ApiKey with .NET User Secrets.");
        }
    }

    // ============================================================
    // SEARCH
    // ============================================================

    public async Task<object> Search(
    string query,
    string? pageToken,
    CancellationToken cancellationToken)
    {
        CheckApiKey();

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{BaseUrl}/places:searchText");

        request.Headers.Add(
            "X-Goog-Api-Key",
            ApiKey);

        request.Headers.Add(
            "X-Goog-FieldMask",
            "places.id," +
            "places.displayName," +
            "places.formattedAddress," +
            "places.rating," +
            "places.userRatingCount," +
            "places.priceLevel," +
            "places.currentOpeningHours," +
            "places.photos," +
            "places.googleMapsUri," +
            "places.location," +
            "places.outdoorSeating," +
            "places.primaryType," +
            "nextPageToken");

        var body = new Dictionary<string, object?>
        {
            ["textQuery"] = $"cafes in {query}",
            ["includedType"] = "cafe",
            ["strictTypeFiltering"] = true,
            ["pageSize"] = 20,
            ["languageCode"] = "en",
            ["regionCode"] = "US"
        };

        if (!string.IsNullOrWhiteSpace(pageToken))
        {
            body["pageToken"] = pageToken;
        }

        request.Content =
            JsonContent.Create(body);

        return await SendSearch(
            request,
            cancellationToken);
    }

    // ============================================================
    // LOCATION AUTOCOMPLETE
    // ============================================================

    public async Task<object> Autocomplete(
        string input,
        CancellationToken cancellationToken)
    {
        CheckApiKey();

        if (string.IsNullOrWhiteSpace(input))
        {
            return new
            {
                suggestions = Array.Empty<object>()
            };
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{BaseUrl}/places:autocomplete");

        request.Headers.Add(
            "X-Goog-Api-Key",
            ApiKey);

        request.Headers.Add(
            "X-Goog-FieldMask",
            "suggestions.placePrediction.placeId," +
            "suggestions.placePrediction.text," +
            "suggestions.placePrediction.structuredFormat," +
            "suggestions.placePrediction.types");

        var body = new Dictionary<string, object?>
        {
            ["input"] = input.Trim(),

            // City + neighborhood + ZIP/postal-code type results.
            ["includedPrimaryTypes"] = new[]
            {
                "(regions)"
            },

            // CafeGo currently targets the United States.
            ["includedRegionCodes"] = new[]
            {
                "us"
            },

            ["languageCode"] = "en",

            ["regionCode"] = "US",

            ["includeQueryPredictions"] = false
        };

        request.Content =
            JsonContent.Create(body);

        using var response =
            await http.SendAsync(
                request,
                cancellationToken);

        var text =
            await response.Content
                .ReadAsStringAsync(
                    cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception(
                $"Google Places autocomplete error: {text}");
        }

        using var document =
            JsonDocument.Parse(text);

        var result =
            new List<object>();

        if (document.RootElement.TryGetProperty(
                "suggestions",
                out var suggestions))
        {
            foreach (
                var suggestion
                in suggestions.EnumerateArray())
            {
                if (!suggestion.TryGetProperty(
                        "placePrediction",
                        out var prediction))
                {
                    continue;
                }

                string? placeId = null;
                string? fullText = null;
                string? mainText = null;
                string? secondaryText = null;

                if (prediction.TryGetProperty(
                        "placeId",
                        out var placeIdElement))
                {
                    placeId =
                        placeIdElement.GetString();
                }

                if (prediction.TryGetProperty(
                        "text",
                        out var textElement) &&
                    textElement.TryGetProperty(
                        "text",
                        out var textValue))
                {
                    fullText =
                        textValue.GetString();
                }

                if (prediction.TryGetProperty(
                        "structuredFormat",
                        out var structured))
                {
                    if (structured.TryGetProperty(
                            "mainText",
                            out var mainTextElement) &&
                        mainTextElement.TryGetProperty(
                            "text",
                            out var mainTextValue))
                    {
                        mainText =
                            mainTextValue.GetString();
                    }

                    if (structured.TryGetProperty(
                            "secondaryText",
                            out var secondaryTextElement) &&
                        secondaryTextElement.TryGetProperty(
                            "text",
                            out var secondaryTextValue))
                    {
                        secondaryText =
                            secondaryTextValue.GetString();
                    }
                }

                result.Add(
                    new
                    {
                        placeId,
                        fullText,
                        mainText,
                        secondaryText
                    });
            }
        }

        return new
        {
            suggestions = result
        };
    }

    // ============================================================
    // CURRENT LOCATION SEARCH
    // ============================================================

    public async Task<object> Nearby(
        double latitude,
        double longitude,
        string? pageToken,
        CancellationToken cancellationToken)
    {
        CheckApiKey();

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                $"{BaseUrl}/places:searchText");

        request.Headers.Add(
            "X-Goog-Api-Key",
            ApiKey);

        request.Headers.Add(
            "X-Goog-FieldMask",
            "places.id," +
            "places.displayName," +
            "places.formattedAddress," +
            "places.rating," +
            "places.userRatingCount," +
            "places.priceLevel," +
            "places.currentOpeningHours," +
            "places.photos," +
            "places.googleMapsUri," +
            "places.location," +
            "places.outdoorSeating," +
            "places.primaryType," +
            "nextPageToken");

        var body =
            new Dictionary<string, object?>
            {
                ["textQuery"] = "cafes",
                ["includedType"] = "cafe",
                ["strictTypeFiltering"] = true,
                ["pageSize"] = 20,
                ["languageCode"] = "en",
                ["regionCode"] = "US",

                ["locationBias"] =
                    new
                    {
                        circle =
                            new
                            {
                                center =
                                    new
                                    {
                                        latitude,
                                        longitude
                                    },

                                radius = 10000.0
                            }
                    }
            };

        if (!string.IsNullOrWhiteSpace(pageToken))
        {
            body["pageToken"] =
                pageToken;
        }

        request.Content =
            JsonContent.Create(body);

        return await SendSearch(
            request,
            cancellationToken);
    }


    // ============================================================
    // SEARCH RESPONSE
    // ============================================================

    private async Task<object> SendSearch(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        using var response =
            await http.SendAsync(
                request,
                cancellationToken);

        var text =
            await response.Content
                .ReadAsStringAsync(
                    cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception(
                $"Google Places error: {text}");
        }

        using var document =
            JsonDocument.Parse(text);

        var root =
            document.RootElement;

        var places =
            new List<object>();

        if (root.TryGetProperty(
                "places",
                out var placesElement))
        {
            foreach (
                var place
                in placesElement.EnumerateArray())
            {
                places.Add(
                    MapPlace(place));
            }
        }

        string? nextPageToken = null;

        if (root.TryGetProperty(
                "nextPageToken",
                out var tokenElement) &&
            tokenElement.ValueKind ==
                JsonValueKind.String)
        {
            nextPageToken =
                tokenElement.GetString();
        }

        return new
        {
            places,
            nextPageToken
        };
    }


    // ============================================================
    // PLACE DETAILS
    // ============================================================

    public async Task<object?> Detail(
        string id,
        CancellationToken cancellationToken)
    {
        CheckApiKey();

        using var request =
            new HttpRequestMessage(
                HttpMethod.Get,
                $"{BaseUrl}/places/{Uri.EscapeDataString(id)}?languageCode=en&regionCode=US");

        request.Headers.Add(
            "X-Goog-Api-Key",
            ApiKey);

        request.Headers.Add(
            "X-Goog-FieldMask",

            "id," +
            "displayName," +
            "formattedAddress," +
            "rating," +
            "userRatingCount," +
            "priceLevel," +

            "currentOpeningHours," +
            "regularOpeningHours," +
            "timeZone," +
            "utcOffsetMinutes," +

            "photos," +
            "googleMapsUri," +
            "websiteUri," +
            "nationalPhoneNumber," +
            "location," +

            // Cafe features
            "parkingOptions," +
            "outdoorSeating," +
            "restroom," +

            // Menu/service information
            "servesCoffee," +
            "servesBreakfast," +
            "servesBrunch," +
            "servesLunch," +
            "servesDessert," +
            "takeout," +

            // Reviews / AI summary
            "reviews," +
            "reviewSummary," +
            "generativeSummary");

        using var response =
            await http.SendAsync(
                request,
                cancellationToken);

        var text =
            await response.Content
                .ReadAsStringAsync(
                    cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception(
                $"Google Places error: {text}");
        }

        using var document =
            JsonDocument.Parse(text);

        return MapPlace(
            document.RootElement,
            true);
    }


    // ============================================================
    // PHOTO
    // ============================================================

    public async Task<string> Photo(
        string name,
        int width,
        int height,
        CancellationToken cancellationToken)
    {
        CheckApiKey();

        if (!name.StartsWith(
                "places/",
                StringComparison.Ordinal))
        {
            throw new Exception(
                "Invalid photo name.");
        }

        var url =
            $"{BaseUrl}/{name}/media" +
            $"?maxWidthPx={Math.Clamp(width, 1, 1600)}" +
            $"&maxHeightPx={Math.Clamp(height, 1, 1600)}" +
            $"&skipHttpRedirect=true" +
            $"&key={Uri.EscapeDataString(ApiKey)}";

        using var response =
            await http.GetAsync(
                url,
                cancellationToken);

        var json =
            await response.Content
                .ReadFromJsonAsync<JsonElement>(
                    cancellationToken:
                    cancellationToken);

        if (!response.IsSuccessStatusCode ||
            !json.TryGetProperty(
                "photoUri",
                out var uri))
        {
            throw new Exception(
                "Photo unavailable.");
        }

        return uri.GetString()!;
    }


    // ============================================================
    // OPENING HOURS HELPERS
    // ============================================================

    private static object? MapOpeningPoint(
        JsonElement point)
    {
        int? day = null;
        int? hour = null;
        int? minute = null;

        int? dateYear = null;
        int? dateMonth = null;
        int? dateDay = null;

        bool truncated = false;

        if (point.TryGetProperty(
                "day",
                out var dayElement) &&
            dayElement.ValueKind ==
                JsonValueKind.Number)
        {
            day =
                dayElement.GetInt32();
        }

        if (point.TryGetProperty(
                "hour",
                out var hourElement) &&
            hourElement.ValueKind ==
                JsonValueKind.Number)
        {
            hour =
                hourElement.GetInt32();
        }

        if (point.TryGetProperty(
                "minute",
                out var minuteElement) &&
            minuteElement.ValueKind ==
                JsonValueKind.Number)
        {
            minute =
                minuteElement.GetInt32();
        }

        if (point.TryGetProperty(
                "truncated",
                out var truncatedElement) &&
            truncatedElement.ValueKind
                is JsonValueKind.True
                or JsonValueKind.False)
        {
            truncated =
                truncatedElement.GetBoolean();
        }

        if (point.TryGetProperty(
                "date",
                out var dateElement))
        {
            if (dateElement.TryGetProperty(
                    "year",
                    out var yearElement))
            {
                dateYear =
                    yearElement.GetInt32();
            }

            if (dateElement.TryGetProperty(
                    "month",
                    out var monthElement))
            {
                dateMonth =
                    monthElement.GetInt32();
            }

            if (dateElement.TryGetProperty(
                    "day",
                    out var dateDayElement))
            {
                dateDay =
                    dateDayElement.GetInt32();
            }
        }

        return new
        {
            day,
            hour,
            minute,

            dateYear,
            dateMonth,
            dateDay,

            truncated
        };
    }


    private static List<object> MapOpeningPeriods(
        JsonElement place,
        string propertyName)
    {
        var result =
            new List<object>();

        if (!place.TryGetProperty(
                propertyName,
                out var openingHours))
        {
            return result;
        }

        if (!openingHours.TryGetProperty(
                "periods",
                out var periods))
        {
            return result;
        }

        foreach (
            var period
            in periods.EnumerateArray())
        {
            object? openPoint = null;
            object? closePoint = null;

            if (period.TryGetProperty(
                    "open",
                    out var open))
            {
                openPoint =
                    MapOpeningPoint(open);
            }

            if (period.TryGetProperty(
                    "close",
                    out var close))
            {
                closePoint =
                    MapOpeningPoint(close);
            }

            result.Add(
                new
                {
                    open = openPoint,
                    close = closePoint
                });
        }

        return result;
    }


    // ============================================================
    // PARKING OPTIONS
    // ============================================================

    private static object? MapParkingOptions(
        JsonElement place)
    {
        if (!place.TryGetProperty(
                "parkingOptions",
                out var parking))
        {
            return null;
        }

        bool? ParkingValue(
            string name)
        {
            if (!parking.TryGetProperty(
                    name,
                    out var value))
            {
                return null;
            }

            if (value.ValueKind ==
                JsonValueKind.True)
            {
                return true;
            }

            if (value.ValueKind ==
                JsonValueKind.False)
            {
                return false;
            }

            return null;
        }

        var freeParkingLot =
            ParkingValue(
                "freeParkingLot");

        var paidParkingLot =
            ParkingValue(
                "paidParkingLot");

        var freeStreetParking =
            ParkingValue(
                "freeStreetParking");

        var paidStreetParking =
            ParkingValue(
                "paidStreetParking");

        var valetParking =
            ParkingValue(
                "valetParking");

        var freeGarageParking =
            ParkingValue(
                "freeGarageParking");

        var paidGarageParking =
            ParkingValue(
                "paidGarageParking");

        var hasKnownInfo =
            freeParkingLot != null ||
            paidParkingLot != null ||
            freeStreetParking != null ||
            paidStreetParking != null ||
            valetParking != null ||
            freeGarageParking != null ||
            paidGarageParking != null;

        return new
        {
            freeParkingLot,
            paidParkingLot,
            freeStreetParking,
            paidStreetParking,
            valetParking,
            freeGarageParking,
            paidGarageParking,
            hasKnownInfo
        };
    }


    // ============================================================
    // MAP PLACE
    // ============================================================

    private static object MapPlace(
        JsonElement place,
        bool detail = false)
    {
        string StringValue(
            string name) =>
            place.TryGetProperty(
                name,
                out var value) &&
            value.ValueKind ==
                JsonValueKind.String
                    ? value.GetString() ?? ""
                    : "";

        double? DoubleValue(
            string name) =>
            place.TryGetProperty(
                name,
                out var value) &&
            value.ValueKind ==
                JsonValueKind.Number
                    ? value.GetDouble()
                    : null;

        int? IntValue(
            string name) =>
            place.TryGetProperty(
                name,
                out var value) &&
            value.ValueKind ==
                JsonValueKind.Number
                    ? value.GetInt32()
                    : null;

        bool? BoolValue(
            string name) =>
            place.TryGetProperty(
                name,
                out var value) &&
            value.ValueKind
                is JsonValueKind.True
                or JsonValueKind.False
                    ? value.GetBoolean()
                    : null;


        // ========================================================
        // NAME
        // ========================================================

        var displayName =
            "Unnamed cafe";

        if (place.TryGetProperty(
                "displayName",
                out var displayNameObject) &&
            displayNameObject.TryGetProperty(
                "text",
                out var displayNameText))
        {
            displayName =
                displayNameText.GetString()
                ?? displayName;
        }


        // ========================================================
        // HOURS
        // ========================================================

        bool? openNow = null;

        var weekdayDescriptions =
            new List<string>();


        if (place.TryGetProperty(
                "regularOpeningHours",
                out var regularHours))
        {
            if (regularHours.TryGetProperty(
                    "weekdayDescriptions",
                    out var regularWeekdays))
            {
                weekdayDescriptions =
                    regularWeekdays
                        .EnumerateArray()
                        .Select(
                            x =>
                                x.GetString()
                                ?? "")
                        .ToList();
            }
        }


        if (weekdayDescriptions.Count == 0 &&
            place.TryGetProperty(
                "currentOpeningHours",
                out var currentHoursFallback))
        {
            if (currentHoursFallback.TryGetProperty(
                    "weekdayDescriptions",
                    out var currentWeekdays))
            {
                weekdayDescriptions =
                    currentWeekdays
                        .EnumerateArray()
                        .Select(
                            x =>
                                x.GetString()
                                ?? "")
                        .ToList();
            }
        }


        if (place.TryGetProperty(
                "currentOpeningHours",
                out var currentHours))
        {
            if (currentHours.TryGetProperty(
                    "openNow",
                    out var open))
            {
                openNow =
                    open.GetBoolean();
            }
        }


        var regularOpeningPeriods =
            MapOpeningPeriods(
                place,
                "regularOpeningHours");

        var currentOpeningPeriods =
            MapOpeningPeriods(
                place,
                "currentOpeningHours");


        // ========================================================
        // TIMEZONE
        // ========================================================

        string? timeZoneId = null;

        if (place.TryGetProperty(
                "timeZone",
                out var timeZone) &&
            timeZone.TryGetProperty(
                "id",
                out var timeZoneIdElement))
        {
            timeZoneId =
                timeZoneIdElement.GetString();
        }

        int? utcOffsetMinutes =
            IntValue(
                "utcOffsetMinutes");


        // ========================================================
        // PHOTOS
        // ========================================================

        var photos =
            new List<object>();

        if (place.TryGetProperty(
                "photos",
                out var photoArray))
        {
            foreach (
                var photo
                in photoArray
                    .EnumerateArray()
                    .Take(10))
            {
                var authorAttributions =
                    new List<object>();

                if (photo.TryGetProperty(
                        "authorAttributions",
                        out var attributions))
                {
                    foreach (
                        var attribution
                        in attributions
                            .EnumerateArray())
                    {
                        string? attributionName =
                            attribution.TryGetProperty(
                                "displayName",
                                out var authorName)
                                    ? authorName.GetString()
                                    : null;

                        string? attributionUri =
                            attribution.TryGetProperty(
                                "uri",
                                out var authorUri)
                                    ? authorUri.GetString()
                                    : null;

                        authorAttributions.Add(
                            new
                            {
                                displayName =
                                    attributionName,

                                uri =
                                    attributionUri
                            });
                    }
                }

                photos.Add(
                    new
                    {
                        name =
                            photo
                                .GetProperty(
                                    "name")
                                .GetString(),

                        authorAttributions
                    });
            }
        }


        // ========================================================
        // LOCATION
        // ========================================================

        double? latitude = null;
        double? longitude = null;

        if (place.TryGetProperty(
                "location",
                out var location))
        {
            if (location.TryGetProperty(
                    "latitude",
                    out var lat))
            {
                latitude =
                    lat.GetDouble();
            }

            if (location.TryGetProperty(
                    "longitude",
                    out var lng))
            {
                longitude =
                    lng.GetDouble();
            }
        }


        // ========================================================
        // PARKING
        // ========================================================

        var parkingOptions =
            detail
                ? MapParkingOptions(place)
                : null;


        // ========================================================
        // REVIEWS
        // ========================================================

        var reviews =
            new List<object>();

        if (detail &&
            place.TryGetProperty(
                "reviews",
                out var reviewsElement))
        {
            foreach (
                var review
                in reviewsElement.EnumerateArray())
            {
                string? reviewText = null;

                if (review.TryGetProperty(
                        "text",
                        out var reviewTextObject) &&
                    reviewTextObject.TryGetProperty(
                        "text",
                        out var reviewTextValue))
                {
                    reviewText =
                        reviewTextValue.GetString();
                }


                string? authorName = null;
                string? authorUri = null;
                string? authorPhotoUri = null;


                if (review.TryGetProperty(
                        "authorAttribution",
                        out var author))
                {
                    if (author.TryGetProperty(
                            "displayName",
                            out var name))
                    {
                        authorName =
                            name.GetString();
                    }

                    if (author.TryGetProperty(
                            "uri",
                            out var uri))
                    {
                        authorUri =
                            uri.GetString();
                    }

                    if (author.TryGetProperty(
                            "photoUri",
                            out var photoUri))
                    {
                        authorPhotoUri =
                            photoUri.GetString();
                    }
                }


                double? reviewRating = null;

                if (review.TryGetProperty(
                        "rating",
                        out var reviewRatingElement) &&
                    reviewRatingElement.ValueKind ==
                        JsonValueKind.Number)
                {
                    reviewRating =
                        reviewRatingElement.GetDouble();
                }


                string? relativeTime = null;

                if (review.TryGetProperty(
                        "relativePublishTimeDescription",
                        out var relativeTimeElement))
                {
                    relativeTime =
                        relativeTimeElement.GetString();
                }


                string? reviewMapsUri = null;

                if (review.TryGetProperty(
                        "googleMapsUri",
                        out var reviewMapsUriElement))
                {
                    reviewMapsUri =
                        reviewMapsUriElement.GetString();
                }


                reviews.Add(
                    new
                    {
                        rating =
                            reviewRating,

                        text =
                            reviewText,

                        relativePublishTimeDescription =
                            relativeTime,

                        googleMapsUri =
                            reviewMapsUri,

                        author =
                            new
                            {
                                displayName =
                                    authorName,

                                uri =
                                    authorUri,

                                photoUri =
                                    authorPhotoUri
                            }
                    });
            }
        }


        // ========================================================
        // REVIEW SUMMARY
        // ========================================================

        string? reviewSummaryText =
            null;

        string? reviewSummaryDisclosure =
            null;

        string? reviewSummaryReviewsUri =
            null;


        if (detail &&
            place.TryGetProperty(
                "reviewSummary",
                out var reviewSummary))
        {
            if (reviewSummary.TryGetProperty(
                    "text",
                    out var summaryText) &&
                summaryText.TryGetProperty(
                    "text",
                    out var summaryTextValue))
            {
                reviewSummaryText =
                    summaryTextValue.GetString();
            }


            if (reviewSummary.TryGetProperty(
                    "disclosureText",
                    out var disclosureText) &&
                disclosureText.TryGetProperty(
                    "text",
                    out var disclosureValue))
            {
                reviewSummaryDisclosure =
                    disclosureValue.GetString();
            }


            if (reviewSummary.TryGetProperty(
                    "reviewsUri",
                    out var reviewsUri))
            {
                reviewSummaryReviewsUri =
                    reviewsUri.GetString();
            }
        }


        // ========================================================
        // PLACE SUMMARY
        // ========================================================

        string? placeSummaryText =
            null;

        string? placeSummaryDisclosure =
            null;


        if (detail &&
            place.TryGetProperty(
                "generativeSummary",
                out var generativeSummary))
        {
            if (generativeSummary.TryGetProperty(
                    "overview",
                    out var overview) &&
                overview.TryGetProperty(
                    "text",
                    out var overviewText))
            {
                placeSummaryText =
                    overviewText.GetString();
            }


            if (generativeSummary.TryGetProperty(
                    "disclosureText",
                    out var disclosureText) &&
                disclosureText.TryGetProperty(
                    "text",
                    out var disclosureValue))
            {
                placeSummaryDisclosure =
                    disclosureValue.GetString();
            }
        }


        // ========================================================
        // RETURN
        // ========================================================

        return new
        {
            id =
                StringValue("id"),

            displayName,

            formattedAddress =
                StringValue(
                    "formattedAddress"),

            rating =
                DoubleValue(
                    "rating"),

            userRatingCount =
                IntValue(
                    "userRatingCount"),

            priceLevel =
                StringValue(
                    "priceLevel"),

            openNow,

            googleMapsUri =
                StringValue(
                    "googleMapsUri"),

            photos,

            latitude,
            longitude,

            timeZoneId,
            utcOffsetMinutes,

            regularOpeningPeriods,
            currentOpeningPeriods,

            websiteUri =
                detail
                    ? StringValue(
                        "websiteUri")
                    : null,

            nationalPhoneNumber =
                detail
                    ? StringValue(
                        "nationalPhoneNumber")
                    : null,

            weekdayDescriptions,

            outdoorSeating =
                BoolValue(
                    "outdoorSeating"),

            restroom =
                detail
                    ? BoolValue(
                        "restroom")
                    : null,

            parkingOptions,

            servesCoffee =
                detail
                    ? BoolValue(
                        "servesCoffee")
                    : null,

            servesBreakfast =
                detail
                    ? BoolValue(
                        "servesBreakfast")
                    : null,

            servesBrunch =
                detail
                    ? BoolValue(
                        "servesBrunch")
                    : null,

            servesLunch =
                detail
                    ? BoolValue(
                        "servesLunch")
                    : null,

            servesDessert =
                detail
                    ? BoolValue(
                        "servesDessert")
                    : null,

            takeout =
                detail
                    ? BoolValue(
                        "takeout")
                    : null,

            reviews,

            reviewSummary =
                new
                {
                    text =
                        reviewSummaryText,

                    disclosureText =
                        reviewSummaryDisclosure,

                    reviewsUri =
                        reviewSummaryReviewsUri
                },

            placeSummary =
                new
                {
                    text =
                        placeSummaryText,

                    disclosureText =
                        placeSummaryDisclosure
                }
        };
    }
}