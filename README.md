# Little Coffee Journal

A private-per-account, iPhone-friendly coffee journal that can be installed from Safari. Entries are stored in Supabase and protected by row-level security. Detailed brew fields cover coffee origin and roast, dose, water, temperature, grind, equipment, timing, recipe, espresso yield, and tasting notes. Every detail is optional.

## Setup

1. The app uses this project's Supabase publishable key in `config.js`. Publishable keys are public browser configuration; never put a Supabase secret or `service_role` key here.
2. Run `supabase-setup.sql` once in the Supabase SQL Editor.
3. Turn on GitHub Pages from the `main` branch and repository root in **Settings → Pages**.
4. In Supabase **Authentication → URL Configuration**, set the Site URL and Redirect URL to `https://dkhimmy.github.io/coffee-journal/`.
5. Open that URL in iPhone Safari, create an account, confirm the email if asked, then sign in.

Each person creates their own account. Supabase RLS policies restrict every read, insert, update, and delete to that account's rows.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup steps and troubleshooting.
