# RealRep deployment setup

The public prototype is hosted at https://qaflex-studio-site.pages.dev/realrep/ through the existing Cloudflare Pages/GitHub project.

## What this repository now contains
- `index.html`: prototype UI.
- `app.js`: Supabase auth, shared feed, posting, reactions and reporting integration.
- `config.js`: public client config placeholders only.
- `supabase/schema.sql`: database tables, RLS policies and aggregated public feed view.

## Activate multi-user mode
1. Create a project at https://supabase.com/ and select a region appropriate for your users.
2. Open SQL Editor in that project and run the full contents of `supabase/schema.sql`.
3. Open Project Settings / API and copy the Project URL and publishable (anon) key.
4. Edit `realrep/config.js` in this repository. Set `supabaseUrl` and `supabaseAnonKey`. The anon/publishable key is intended for browser use with RLS enabled. NEVER paste the service_role/secret key into frontend files.
5. In Supabase Authentication URL Configuration, add `https://qaflex-studio-site.pages.dev/realrep/` as the Site URL and allowed redirect URL. Enable email/password authentication. For a public launch, configure an SMTP provider and email confirmation.
6. Wait for the connected Cloudflare Pages deployment to finish. Reload the page and create a test account.
7. Test two separate accounts in different browsers/devices: registration, email confirmation, sign-in/out, posting, one reaction per user/post, toggle/remove reaction, reporting, unauthorized access and account deletion.
8. Review the Security Advisor and run a security review before broad launch.

## Security and product limits
- RLS policies are enabled for user-owned writes.
- Raw reaction rows are readable only by their owner; the feed view exposes aggregate counts only.
- The public score is an approval estimate, not proof of misconduct.
- The current report table stores reports but does not include a staffed admin dashboard or automated abuse detection.
- Before public launch, implement and test report triage, moderator roles, appeal workflow, rate limits, bot/brigading detection, account recovery, privacy/data-deletion processes, and applicable legal policies.
- Do not collect sensitive personal data. Never use a service-role key in browser code.

This setup still requires the project owner to create/configure the external Supabase project. No Supabase credentials are included in the repository.
