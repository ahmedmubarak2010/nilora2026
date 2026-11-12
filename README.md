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

Farmers can complete their profile, create farms, and add fields. Agronomists see an approval-pending state until approved; approved agronomists can view farms assigned to them and existing assessment records. NASA data ingestion, crop-plan generation, review mutations, and live production deployment are not represented as complete until implemented and tested.
