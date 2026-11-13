# NILORA

NILORA is an agricultural technology project exploring how satellite imagery and climate information can support farmers and agronomists in Egypt.

## Current website

The repository currently contains the public-facing website and authentication flow only:

- `index.html` — public landing page.
- `signup.html` — Google and email/password sign-in and account creation.
- `auth-callback.html` — completes Google OAuth sign-in.
- `reset-password.html` — password recovery and update flow.
- `soon.html` — destination shown after successful sign-in while the platform is being prepared.

Authentication is handled by Supabase Auth. The public Supabase URL and publishable key are loaded from `config.js`; never place a service-role key or other secret in client-side files.

## Deployment

This is a static website. Vercel serves the repository root directly; no React, Vite, Node build step, or dashboard bundle is required.

## Brand assets

The `Assets/` directory contains the NILORA logos and the images used by the public landing page.

## Future development

When the product experience is ready to resume, add only the pages and integrations that are actively being implemented. Keep the public landing page independent from future application work.
