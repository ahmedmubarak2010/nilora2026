# NILORA

Agricultural information and decision-support platform for farmers and agronomists in Egypt.

## Product journey

1. Users sign in with Google through Supabase Auth (email/password remains an optional fallback).
2. New users complete their profile and select **Farmer** or **Agronomist**.
3. Farmers register a farm and draw a field boundary on a NASA GIBS satellite map.
4. NILORA calculates the polygon area, perimeter, approximate longest dimension and approximate width, then stores the boundary and measurements.
5. The user is routed to the role-specific English dashboard.

Agronomist accounts require platform approval before professional data and tools are enabled.

## Current structure

\`\`\`text
/
├── index.html                         # Public landing page (kept separate)
├── signup.html                        # Google-first sign in
├── auth-callback.html                 # Google OAuth callback
├── reset-password.html                # Password recovery
├── onboarding.html                    # Profile, role and farmer farm setup
├── farmer-dashboard.html              # Farmer overview
├── farmer-farms.html                  # Create and list farms
├── farmer-fields.html                 # Create and list fields
├── agronomist-dashboard.html          # Agronomist overview
├── agronomist-farms.html              # Assigned farms
├── agronomist-reviews.html            # Crop assessments
├── config.js                          # Supabase URL + publishable browser key
├── supabase/
│   └── migrations/                    # Database migrations tracked with the app
└── assets/
    ├── css/
    │   ├── app.css
    │   ├── dashboard.css
    │   └── onboarding.css
    └── js/
        ├── supabase.js
        ├── auth.js
        ├── guard.js
        ├── ui.js
        ├── data.js
        └── pages/
            ├── onboarding.js
            ├── farmer-dashboard.js
            └── agronomist-dashboard.js
\`\`\`

## Farm mapping and measurements

- The onboarding map uses NASA Global Imagery Browse Services (GIBS) MODIS Terra Corrected Reflectance True Color tiles.
- OpenStreetMap is available as an alternate street-map layer for navigation and local context.
- A farmer draws a polygon or rectangle around the field. The GeoJSON boundary is saved to \`public.fields.boundary_geojson\`.
- Area is calculated geodesically from the polygon and converted to feddans (1 feddan = 4,200.833 m²).
- Perimeter is calculated from the polygon boundary.
- Longest dimension and width are approximate dimensions from a principal-axis-aligned bounding box around the drawn polygon. They are not a cadastral survey.
- The NASA GIBS MODIS layer is a broad satellite context layer (250 m source imagery), not parcel-level imagery. The farmer must draw the actual boundary; NASA does not automatically detect the farm boundary.
- Browser geolocation is optional. If permission is unavailable, the farmer can navigate the map manually.
- The farm's stored latitude/longitude is the polygon centroid. Field dimensions and boundary are saved separately on the field record.

## Backend and security

The project uses Supabase Auth and Postgres tables including \`profiles\`, \`farms\`, \`fields\`, \`farm_assignments\`, \`climate_observations\`, \`crop_assessments\`, \`crop_plans\`, \`model_runs\`, \`notifications\`, and support/admin tables.

- New auth users receive a profile through a database trigger.
- Account type is selected during first profile onboarding and cannot be changed after onboarding is completed.
- Agronomist accounts are set to \`pending\` and require platform approval.
- Farm and field ownership is enforced by Row Level Security.
- The browser uses only a Supabase publishable key. Never add a service-role or secret key to this repository.

## NASA and satellite integrations

- \`nasa-power\` (Supabase Edge Function, JWT required) fetches daily NASA POWER agroclimatology parameters and GPM IMERG precipitation.
- Retrieved observations are stored in \`public.climate_observations\` with source, date, units, spatial/temporal resolution and provenance metadata.
- \`sentinel-scenes\` (Supabase Edge Function, JWT required) searches the Copernicus Data Space STAC catalogue for Sentinel-2 L2A scenes near the registered farm coordinate.
- The Sentinel-2 integration currently discovers scenes only. It does **not** yet download imagery, calculate NDVI, classify crop stress or diagnose disease.
- NASA POWER and GPM are gridded estimates, not measurements from sensors installed in the farmer's field.
- Cloud cover shown for Sentinel-2 is scene-level metadata and is not a field-level cloud percentage.

## AI integration

CoreX AI is planned as the assistant provider for the hackathon. The UI includes an integration placeholder only. Connect it after the team supplies the official API documentation, endpoint, authentication scheme, request/response format and free-tier limits. Store the provider key in a server-side secret and call it through a Supabase Edge Function; never expose it in browser JavaScript.

## Development notes

- Keep the public landing page independent from dashboard changes.
- Use the existing Supabase schema and RLS policies rather than duplicating data.
- Do not display generated crop recommendations, yield predictions or disease diagnoses unless a validated model or transparent rule set actually produces them.
- Keep source labels, dates, spatial resolution and uncertainty visible in data-driven features.
