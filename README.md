# Spendly (by Bhimeshwara Rao)

Static site (`index.html`) + Supabase (auth, Postgres with RLS) + one Vercel serverless function (`api/delete-account.js`).

## Deploy order
1. **Supabase:** create a project. SQL Editor > run `database/1-schema.sql`.
2. **index.html:** paste Project URL + anon key (Project Settings > API) into `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Never paste the service_role key here.
3. **GitHub:** push this whole folder.
4. **Vercel:** Add New > Project > import repo > Framework "Other" > Deploy.
5. **Vercel env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, then redeploy.
6. **Supabase > Authentication > URL Configuration:** Site URL = your Vercel URL; Redirect URLs = Vercel URL and http://localhost:3000.
7. **Google sign-in:** Google Cloud OAuth client; add ID/secret in Supabase > Authentication > Providers > Google.
8. **Verification email:** Supabase > Authentication > Emails > Confirm signup: paste `database/verify-email-template.html`. Enable Confirm email. Add custom SMTP (e.g. Resend) before real launch.

## Optional: morning/evening reminder emails
Needs Resend, Supabase CLI, `supabase/functions/send-reminders`, and `database/2-reminders-optional.sql` (replace placeholders). Skip if you only want the verification email.

## Test before claiming it is secure
Two accounts isolated; unverified signup blocked; password reset; logout; expired session; Google redirect (local + Vercel); requests without login refused; account deletion.
