# Brendan's Coffee Journal · setup and deployment

This is a static, iPhone-friendly Progressive Web App. Supabase handles sign-in and stores each person’s entries. GitHub Pages serves the app. The browser contains only the Supabase **publishable** key (or legacy `anon` key); never put a `service_role` or secret key in this project.

## 1. Prepare Supabase

1. Open your project in the Supabase dashboard.
2. In **SQL Editor**, choose a new query, paste all of [`supabase-setup.sql`](supabase-setup.sql), and run it. This creates the table and per-user Row Level Security policies.
3. Open **Project Settings → API Keys**. Copy the Project URL and the **publishable** key (it begins `sb_publishable_`). Older projects may show the legacy `anon` key; that is also safe for this browser app. Do not copy a `secret` or `service_role` key.
4. Open `config.js`. For this project, the URL and publishable key are already filled in. If you fork the app for a different Supabase project, replace both with that project's Project URL and publishable/anon key.
5. In **Authentication → URL Configuration**, add your eventual GitHub Pages address to **Site URL** and **Redirect URLs**. For a repository named `coffee-journal`, the address is `https://YOUR-GITHUB-USERNAME.github.io/coffee-journal/`. If you use a custom domain, add that too. You can update this after enabling Pages.
6. Under **Authentication → Providers → Email**, leave email/password enabled. Email confirmation can stay enabled; the user needs access to their own inbox to confirm.

The existing project was updated with optional brew and tasting columns. If you are setting up a fresh copy, run the full SQL file. If you already ran the original version, run only the final `Add Coffee Journal's detailed tasting and brew fields` section; it adds nullable columns and preserves existing entries.

## 2. Put the app on GitHub Pages

1. Create a new GitHub repository named `coffee-journal`. You can make it public for free GitHub Pages hosting; the source contains a public key only, and RLS protects journal rows.
2. Upload all files in this folder to the repository’s root. Include `index.html`, `app.js`, `styles.css`, `config.js`, `manifest.webmanifest`, `service-worker.js`, `icon.svg`, and `supabase-setup.sql`.
3. In GitHub open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
4. Wait for GitHub to publish the site. Visit the Pages URL. Return to Supabase **Authentication → URL Configuration** and set the exact live Pages URL as the Site URL and an allowed Redirect URL.
5. Create an account for yourself and confirm your email. Add a test coffee entry, refresh, and sign in again to confirm it remains. Your friend should create their own account using their own email; do not create or share a password for them.

## 3. Add it to iPhone

Open the published Pages URL in **Safari**. Tap **Share → Add to Home Screen → Add**. Launch it from its new home-screen icon. Sign in once; Supabase keeps the session on that iPhone. The interface and app shell can load offline, but adding or loading journal entries needs an internet connection. Cloud sync works across signed-in devices.

## If something goes wrong

- **Setup needed:** `config.js` still has placeholders or a key with the wrong format.
- **Table missing / relation not found:** run `supabase-setup.sql` in the correct project’s SQL Editor.
- **Email confirmation link returns to the wrong place:** add the exact Pages address (including repository path and trailing slash) to Supabase Redirect URLs.
- **Permission denied / entries do not load:** check that RLS is enabled and all four policies from the SQL exist. Do not “fix” this by disabling RLS or using a secret key.
- **A saved change to `config.js` does not appear:** reload the page after deployment; on iPhone, close and reopen the installed app to refresh its cached shell.

## Files

- `index.html`, `styles.css`, `app.js`: the app.
- `config.js`: public Supabase URL and publishable/anon key placeholders.
- `supabase-setup.sql`: table and private-per-user policies.
- Detailed entries include origin, varietal, processing, roast, dose, water amount and temperature, grind, equipment, timings, recipe, espresso yield and pressure, and sensory notes/scores.
- `manifest.webmanifest`, `service-worker.js`, `icon.svg`: installable PWA shell.

Supabase’s publishable key is intended for public clients and does not bypass RLS. Signed-in requests include the user’s auth token, and policies compare the row’s `user_id` to `auth.uid()`. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), and [GitHub Pages](https://docs.github.com/en/pages).
