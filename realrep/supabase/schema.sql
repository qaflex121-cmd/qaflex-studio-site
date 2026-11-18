-- RealRep initial schema for Supabase/PostgreSQL.
-- Apply in Supabase SQL Editor. Review before production use.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_id_idx on public.posts(author_id);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists reactions_user_id_idx on public.reactions(user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists reports_status_created_idx on public.reports(status, created_at);

-- Create a profile after a user signs up. Username must be supplied in auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
  chosen_name text;
begin
  chosen_username := coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8));
  chosen_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), chosen_username);
  insert into public.profiles (id, username, display_name)
  values (new.id, chosen_username, chosen_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_realrep on auth.users;
create trigger on_auth_user_created_realrep
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Touch updated_at for posts and reactions.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts
for each row execute procedure public.touch_updated_at();
drop trigger if exists reactions_touch_updated_at on public.reactions;
create trigger reactions_touch_updated_at before update on public.reactions
for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable" on public.profiles
for select using (true);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable" on public.posts
for select using (true);

drop policy if exists "Authenticated users create their own posts" on public.posts;
create policy "Authenticated users create their own posts" on public.posts
for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "Authors update their own posts" on public.posts;
create policy "Authors update their own posts" on public.posts
for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Authors delete their own posts" on public.posts;
create policy "Authors delete their own posts" on public.posts
for delete to authenticated using (auth.uid() = author_id);

-- Users may see only their own raw reaction rows; aggregate counts are exposed through a limited view.
drop policy if exists "Users read their own reactions" on public.reactions;
create policy "Users read their own reactions" on public.reactions
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users create their own reactions" on public.reactions;
create policy "Users create their own reactions" on public.reactions
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users update their own reactions" on public.reactions;
create policy "Users update their own reactions" on public.reactions
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own reactions" on public.reactions;
create policy "Users delete their own reactions" on public.reactions
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users create reports as themselves" on public.reports;
create policy "Users create reports as themselves" on public.reports
for insert to authenticated with check (auth.uid() = reporter_id);

drop policy if exists "Users view their own reports" on public.reports;
create policy "Users view their own reports" on public.reports
for select to authenticated using (auth.uid() = reporter_id);

-- Creator-level reputation aggregates all reactions on all of a creator's posts.
-- The public view exposes only totals and a derived approval estimate, never voter identities.
create or replace view public.creator_reputation as
select
  pr.id as author_id,
  coalesce(sum(rc.like_count), 0)::bigint as like_count,
  coalesce(sum(rc.dislike_count), 0)::bigint as dislike_count,
  case
    when coalesce(sum(rc.like_count), 0) + coalesce(sum(rc.dislike_count), 0) = 0 then 50
    else round(100.0 * (coalesce(sum(rc.like_count), 0) + 2) /
      (coalesce(sum(rc.like_count), 0) + coalesce(sum(rc.dislike_count), 0) + 4))::integer
  end as reputation_score
from public.profiles pr
left join public.posts p on p.author_id = pr.id
left join (
  select post_id,
    count(*) filter (where reaction = 'like') as like_count,
    count(*) filter (where reaction = 'dislike') as dislike_count
  from public.reactions
  group by post_id
) rc on rc.post_id = p.id
group by pr.id;

-- Public feed contains only aggregate reaction counts, never voter identities.
-- The view owner can aggregate underlying reaction rows; only safe columns are exposed.
create or replace view public.feed_posts as
select
  p.id,
  p.author_id,
  p.body,
  p.created_at,
  pr.username,
  pr.display_name,
  coalesce(rc.like_count, 0)::bigint as like_count,
  coalesce(rc.dislike_count, 0)::bigint as dislike_count,
  case
    when coalesce(rc.like_count, 0) + coalesce(rc.dislike_count, 0) = 0 then 50
    else round(100.0 * (coalesce(rc.like_count, 0) + 2) /
      (coalesce(rc.like_count, 0) + coalesce(rc.dislike_count, 0) + 4))::integer
  end as post_approval_score,
  cr.reputation_score as creator_reputation_score
from public.posts p
join public.profiles pr on pr.id = p.author_id
join public.creator_reputation cr on cr.author_id = p.author_id
left join (
  select post_id,
    count(*) filter (where reaction = 'like') as like_count,
    count(*) filter (where reaction = 'dislike') as dislike_count
  from public.reactions
  group by post_id
) rc on rc.post_id = p.id;

grant select on public.feed_posts to anon, authenticated;
grant select on public.creator_reputation to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;
grant select, insert on public.reports to authenticated;

-- Security note: reputation shown in this MVP is an approval indicator derived from post reactions,
-- not a finding of misconduct. Before broad public launch, add moderation staffing, abuse-rate limits,
-- coordinated-voting detection, account recovery and privacy/retention procedures.
