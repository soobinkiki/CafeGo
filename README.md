# CafeGo v0.5

This version removes:
- Login
- Coffee Points
- Check-ins
- SQL Server / SSMS

Architecture:

React + Bootstrap -> ASP.NET Core C# -> Google Places API (New)

## 1. Put the new folder here

Recommended:

C:\Projects\CafeGo-v0.3\CafeGo

Keep your v0.1 folder as a backup.

## 2. Google setup

You need:
- Google Cloud project
- Billing enabled
- Places API (New) enabled
- Google Maps Platform API key

Do not put the key in React.

Inside CafeGo.Api create:

appsettings.Development.json

with:

```json
{
  "GooglePlaces": {
    "ApiKey": "YOUR_REAL_API_KEY"
  }
}
```

## 3. Backend

```powershell
cd C:\Projects\CafeGo-v0.3\CafeGo\CafeGo.Api
dotnet run
```

Expected:
http://localhost:5091

## 4. Frontend

New terminal:

```powershell
cd C:\Projects\CafeGo-v0.3\CafeGo\cafego-client
npm install
npm run dev
```

Open:
http://localhost:5173

## 5. Try

- Koreatown Los Angeles
- Irvine California
- Pasadena California
- Use my current location

## Important

Google Places does not reliably provide a complete structured menu for every cafe, so the detail page links to the official cafe website for menu/prices.

Before public launch, improve Google photo author attribution rendering whenever Google returns authorAttributions, review Google Maps Platform attribution requirements, and restrict your API key.


## v0.3 UI changes
- Added Open now / Outdoor seating / minimum rating filters.
- Added rating, review count, and closest-to-me sorting.
- Removed all AdSense placeholder blocks.
- Refined Open/Closed status pills.
- Directions and Website use matching white outline buttons with green hover.
- Menu & Food now uses friendly fallback copy when no structured food attributes are available.


## v0.4 detail page refinements

- Cafe detail photos use a contain-style presentation to avoid aggressive cropping.
- Detail page can cycle through up to 10 Google Places photos.
- Previous/next carousel buttons and photo count are included.
- Directions and Website stay on one row.
- Removed the extra “Photos and place information…” line.
- “GOOGLE PLACE INFORMATION” was renamed to “VISIT DETAILS”.
- Food attributes are styled as categories rather than buttons.
- Website / phone actions use the same white-outline / green-hover style.
- Cafe search is also server-filtered to Google primaryType `cafe`.


## v0.5

- Text Search pagination now uses Google Places `nextPageToken`.
- Results stay at 20 places per page.
- Page numbers are revealed as additional Google result pages become available.
- Current-location search now uses paginated Text Search with a location bias.
- "Show distance from me" requests browser geolocation only when needed.
- If the user uses "Use my current location", distance is automatically enabled.
- The user's coordinates are remembered only in browser `sessionStorage` for the current browsing session.
- Cafe cards show straight-line distance in miles and an 8-point compass direction (N, NE, E, SE, S, SW, W, NW).
- Removed the old footer sentence "Place information provided by Google".
- A small required "Google Maps" attribution is displayed next to Google-powered result/detail content instead.
- Photo author attribution is displayed when Google returns it.
- Removed the extra server-side `primaryType == "cafe"` filter; Google strict type filtering remains enabled.
