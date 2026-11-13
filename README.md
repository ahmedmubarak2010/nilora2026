# NILORA

Agricultural information and decision-support platform for farmers and agronomists in Egypt.

## Current structure

```text
/
├── index.html                    # Public landing page
├── signup.html                   # Sign in and account creation
├── auth-callback.html            # Google OAuth callback
├── reset-password.html           # Password recovery
├── onboarding.html               # Shared account profile setup
├── farmer-dashboard.html         # Farmer overview
├── farmer-farms.html             # Create and list farms
├── farmer-fields.html             # Create and list fields
├── agronomist-dashboard.html     # Agronomist overview
├── agronomist-farms.html         # Assigned farms
├── agronomist-reviews.html       # Existing crop assessments
├── config.js                     # Supabase URL + publishable browser key
└── assets/
    ├── css/app.css               # Shared application styles
    └── js/
        ├── supabase.js           # Supabase client
        ├── auth.js               # Sign in, sign up, Google OAuth, recovery
        ├── guard.js              # Session and role checks
        ├── ui.js                 # Shared sidebar and application shell
        ├── data.js               # Shared database access methods
        └── pages/                # One JavaScript module per page
```

## Add a new page

1. Create a new HTML file in the repository root, for example `farmer-crop-plans.html`.
2. Copy the shared script includes from an existing dashboard HTML file.
3. Add a page module at `assets/js/pages/farmer-crop-plans.js`.
4. Start the module with `const profile = await NILORA.requireRole(["farmer"]); if (!profile) return;`.
5. Call `NILORA.mount({ title: "Crop plans", active: "farmer-crop-plans.html", role: "farmer" })`.
6. Put page-specific queries and UI in that page module. Put reusable database methods in `assets/js/data.js`.
7. Add the page link to the relevant navigation list in `assets/js/ui.js`.

For an agronomist-only page, use `NILORA.requireRole(["agronomist"])` and check `profile.agronomist_status === "approved"` before showing professional workspace data.

## Backend

The project uses Supabase Auth and the existing Postgres tables: `profiles`, `farms`, `fields`, `farm_assignments`, `climate_observations`, `crop_assessments`, `crop_plans`, `model_runs`, `notifications`, and support/admin tables.

New auth users receive a profile through a database trigger. The requested account type is limited to `farmer` or `agronomist`; agronomist accounts start with `pending` approval. Privileged profile fields cannot be changed directly from the browser. Keep Row Level Security enabled.

The browser uses only a Supabase publishable key. Never add a service-role or secret key to this repository.

## Current implementation scope

Farmers can complete their profile, create farms with coordinates, and add fields. The Arabic farmer dashboard reads real farm/field records from Supabase.\n\n### Satellite and climate data\n\n- `nasa-power` (Supabase Edge Function, JWT required) validates that the signed-in farmer owns the selected field, fetches daily NASA POWER agroclimatology parameters, and includes `IMERG_PRECTOT` (GPM IMERG daily precipitation at approximately 0.1° / 10 km).\n- Retrieved daily observations are saved to `public.climate_observations` with source, date, units, spatial/temporal resolution, and provenance metadata. Existing parameter/date rows are checked before inserting to reduce duplicate records.\n- `sentinel-scenes` (Supabase Edge Function, JWT required) searches the Copernicus Data Space STAC catalogue for Sentinel-2 L2A scenes intersecting the registered farm coordinate. It returns acquisition dates and scene-level cloud-cover metadata.\n- The Sentinel-2 integration currently discovers scenes only. It does **not** yet download imagery, calculate NDVI, classify crop stress, or diagnose disease. A farm point is used until a verified field boundary is available.\n- NASA POWER and GPM are gridded estimates, not measurements from sensors installed in the farmer’s field. The dashboard displays source and resolution caveats.\n\nAgronomists see an approval-pending state until approved; approved agronomists can view farms assigned to them and existing assessment records. Crop-plan generation, NDVI processing, review mutations, and live website hosting/deployment are not represented as complete.
