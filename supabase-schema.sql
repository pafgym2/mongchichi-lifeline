create extension if not exists pgcrypto;

create table if not exists timelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text default '#23966B',
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  timeline_id uuid references timelines(id) on delete cascade,
  title text not null,
  event_date date not null,
  person text,
  category text,
  significance text,
  location text,
  youtube_url text,
  description text,
  photo_urls text[] default '{}',
  created_at timestamptz default now()
);

alter table timelines enable row level security;
alter table events enable row level security;

drop policy if exists "Users can read own timelines" on timelines;
drop policy if exists "Users can insert own timelines" on timelines;
drop policy if exists "Users can update own timelines" on timelines;
drop policy if exists "Users can delete own timelines" on timelines;

create policy "Users can read own timelines"
  on timelines for select
  using (auth.uid() = user_id);

create policy "Users can insert own timelines"
  on timelines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own timelines"
  on timelines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own timelines"
  on timelines for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own events" on events;
drop policy if exists "Users can insert own events" on events;
drop policy if exists "Users can update own events" on events;
drop policy if exists "Users can delete own events" on events;

create policy "Users can read own events"
  on events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own events"
  on events for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload own event photos" on storage.objects;
drop policy if exists "Users can view event photos" on storage.objects;
drop policy if exists "Users can update own event photos" on storage.objects;
drop policy if exists "Users can delete own event photos" on storage.objects;

create policy "Users can upload own event photos"
  on storage.objects for insert
  with check (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view event photos"
  on storage.objects for select
  using (bucket_id = 'event-photos');

create policy "Users can update own event photos"
  on storage.objects for update
  using (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own event photos"
  on storage.objects for delete
  using (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
