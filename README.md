# NILORA

Agricultural information and decision-support platform for farmers and agronomists in Egypt.

## Product journey

1. Google-first sign-in through Supabase Auth (email/password remains an optional fallback).
2. Profile completion and one-time Farmer / Agronomist role selection.
3. Farmer farm setup with NASA GIBS context imagery, optional browser geolocation, and polygon/rectangle boundary drawing.
4. Geodesic field area, perimeter and approximate dimensions are saved to Supabase.
5. Users enter a dedicated Farmer or Agronomist workspace.

## Dashboard architecture

The two overview dashboards have been replaced with a React application built with **React 19, TypeScript, Vite, Recharts and Leaflet**. The dashboard is compiled into `assets/dashboard/`; the rest of the public website and its existing page URLs remain static and are copied into Vercel's `dist/` output by `scripts/copy-site.mjs`.

- Farmer workspace: farm and field totals, field dimensions, registered field list, NASA GIBS map context, NASA POWER / GPM climate observations, temperature history, and Sentinel-2 scene catalogue.
- Agronomist workspace: approval-pending state, assigned farms, assessment activity and review status.
- Responsive sidebar, account identity, source labels, loading/error/empty states and mobile layouts.
- The public landing page (`index.html`) is not changed by the dashboard rebuild.

### Build

```bash
npm install
npm run build
```

Vercel uses `npm run build` and serves the `dist/` directory. The build script preserves the existing static pages and copies the compiled React dashboard into the published site.

## Farm mapping and measurements

- Onboarding uses NASA Global Imagery Browse Services (GIBS) MODIS Terra Corrected Reflectance True Color tiles.
- OpenStreetMap provides a street-map layer for navigation and local context.
- The farmer draws the field polygon. GeoJSON is saved in `public.fields.boundary_geojson`.
- Area is calculated geodesically and converted to feddans (1 feddan = 4,200.833 m²).
- Perimeter is calculated from the drawn polygon.
- Length and width are approximate principal-axis bounding-box dimensions, not cadastral or legal survey measurements.
- The NASA GIBS MODIS layer is broad context imagery (250 m source imagery), not parcel-level high-resolution imagery. The farmer draws the real boundary; NASA does not automatically detect it.
- Browser geolocation is optional. The farmer can navigate the map manually if permission is unavailable.

## NASA and satellite integrations

- `nasa-power` is a Supabase Edge Function (JWT required) that retrieves daily NASA POWER agroclimatology parameters including mean/min/max temperature, relative humidity, solar radiation and POWER precipitation.
- GPM IMERG daily precipitation is returned separately as `IMERG_PRECTOT`; it is not the same product as POWER precipitation.
- Observations are stored in `public.climate_observations` with source, date, units, spatial/temporal resolution and provenance metadata.
- `sentinel-scenes` searches the Copernicus Data Space STAC catalogue for Sentinel-2 L2A scenes around the registered farm location.
- The Sentinel integration currently discovers catalogue scenes only. It does **not** download imagery, calculate NDVI, classify crop stress or diagnose disease.
- NASA POWER and GPM are gridded estimates, not measurements from sensors installed in the field.
- Sentinel cloud cover is scene-level metadata, not a field-level cloud percentage.
- NASA GIBS map imagery is a visual context layer, not the source used for field measurement.

## Planned capabilities

Crop plans, rule-based alerts, local market prices, voice interaction, farmer community and input marketplace features should be connected only when their data sources, business rules and operational workflows are available. The interface must not present unavailable integrations as live features.

CoreX AI is planned for the hackathon. The current dashboard does not call CoreX AI. Connect it only after the official API documentation, endpoint, authentication scheme, request/response format and free-tier limits are supplied. Store its key in a server-side secret and call it through a Supabase Edge Function; never expose it in browser JavaScript.

## Backend and security

The project uses Supabase Auth and Postgres tables including `profiles`, `farms`, `fields`, `farm_assignments`, `climate_observations`, `crop_assessments`, `crop_plans`, `model_runs`, `notifications` and support/admin tables.

- New auth users receive a profile through a database trigger.
- Account type is selected during first profile onboarding and cannot be changed after onboarding is completed.
- Agronomist accounts start as `pending` and require platform approval.
- Farm and field ownership is enforced by Row Level Security.
- The browser uses only the Supabase publishable key. Never add a service-role or secret key to the repository.

## Development notes

- Keep the public landing page independent from dashboard changes.
- Reuse the existing Supabase schema and RLS policies.
- Do not display generated crop recommendations, yield predictions or disease diagnoses unless a validated model or transparent rule set actually produces them.
- Keep source labels, acquisition dates, spatial resolution and uncertainty visible in data-driven features.
