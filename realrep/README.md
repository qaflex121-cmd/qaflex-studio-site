# RealRep public preview

This folder contains the public interactive RealRep prototype.

## Preview
https://qaflex-studio-site.pages.dev/realrep/

## Current scope
- Responsive social-feed preview
- Local demo posting and likes/dislikes
- Sample reputation score
- Browser-local persistence
- Report interaction demonstration

## Important
This is a prototype only. User accounts, shared cross-device posts, server-side reputation, media upload, real moderation queues, appeals, and production abuse protection are not connected. Sample creators and statistics are fictional. Do not use this preview for real personal data or treat its scores as judgments of real people.

## Backend launch requirements
1. Create a Supabase project.
2. Apply the SQL migration from the RealRep source package.
3. Configure Supabase Auth allowed URLs for the deployed domain.
4. Add the public Supabase URL and anon/publishable key through deployment configuration.
5. Verify RLS, auth, reaction constraints, reputation triggers, reports, account deletion, privacy requests, and moderation workflows.
6. Run security and end-to-end tests before inviting public users.
