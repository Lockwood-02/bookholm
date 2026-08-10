-- Bookholm initial database schema
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists pgcrypto;

create type public.reading_status as enum (
  'want_to_read',
  'reading',
  'finished',
  'did_not_finish'
);

create type public.review_visibility as enum ('private', 'public');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username = lower(username))
    check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shared catalog records. Provider IDs preserve the source used to import metadata.
create table public.books (
  id uuid primary key default gen_random_uuid(),
  google_books_id text unique,
  open_library_id text unique,
  isbn_10 text,
  isbn_13 text,
  title text not null check (char_length(title) between 1 and 500),
  subtitle text,
  authors text[] not null default '{}',
  description text,
  publisher text,
  published_date text,
  page_count integer check (page_count is null or page_count > 0),
  language_code text,
  categories text[] not null default '{}',
  cover_small_url text,
  cover_medium_url text,
  cover_large_url text,
  metadata_source text check (
    metadata_source is null or metadata_source in ('google_books', 'open_library', 'manual')
  ),
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (isbn_10 is null or isbn_10 ~ '^[0-9Xx]{10}$'),
  check (isbn_13 is null or isbn_13 ~ '^[0-9]{13}$')
);

create unique index books_isbn_10_unique
  on public.books (isbn_10)
  where isbn_10 is not null;

create unique index books_isbn_13_unique
  on public.books (isbn_13)
  where isbn_13 is not null;

create index books_title_search_idx
  on public.books using gin (to_tsvector('simple', title));

-- One row per book in a user's library. Private notes never need to be exposed
-- when a bookshelf or review is public.
create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status public.reading_status not null default 'want_to_read',
  rating smallint check (rating is null or rating between 1 and 5),
  private_notes text,
  started_at date,
  finished_at date,
  is_favorite boolean not null default false,
  times_read integer not null default 0 check (times_read >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index user_books_user_status_idx
  on public.user_books (user_id, status);

create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  theme text not null default 'classic-oak',
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index shelves_user_order_idx on public.shelves (user_id, sort_order);

create table public.shelf_books (
  shelf_id uuid not null references public.shelves(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  -- Stored explicitly so a public shelf can join to catalog data without
  -- exposing the owner's private user_books row.
  book_id uuid not null references public.books(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (shelf_id, user_book_id)
);

create index shelf_books_shelf_position_idx
  on public.shelf_books (shelf_id, position);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_book_id uuid not null unique references public.user_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text check (char_length(title) <= 150),
  body text not null check (char_length(body) between 1 and 10000),
  visibility public.review_visibility not null default 'private',
  contains_spoilers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_public_created_idx
  on public.reviews (created_at desc)
  where visibility = 'public';

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  pages_read integer check (pages_read is null or pages_read > 0),
  minutes_read integer check (minutes_read is null or minutes_read > 0),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  check (pages_read is not null or minutes_read is not null or note is not null)
);

create index reading_sessions_user_date_idx
  on public.reading_sessions (user_id, session_date desc);

-- Keep updated_at consistent without trusting the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();
create trigger user_books_set_updated_at before update on public.user_books
for each row execute function public.set_updated_at();
create trigger shelves_set_updated_at before update on public.shelves
for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

-- Create a minimal profile whenever a Supabase Auth user is registered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'reader'),
    '[^a-zA-Z0-9_]', '', 'g'
  ));

  if char_length(requested_username) < 3 then
    requested_username := 'reader';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(requested_username, 21) || '_' || substr(new.id::text, 1, 8),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cross-table ownership checks stop clients from attaching another user's book
-- to their shelf or review, even if an ID is guessed.
create or replace function public.validate_shelf_book_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.shelves s
    join public.user_books ub on ub.id = new.user_book_id
    where s.id = new.shelf_id
      and s.user_id = ub.user_id
      and ub.book_id = new.book_id
  ) then
    raise exception 'Shelf and library book must belong to the same user';
  end if;
  return new;
end;
$$;

create trigger shelf_books_validate_owner
  before insert or update on public.shelf_books
  for each row execute function public.validate_shelf_book_owner();

create or replace function public.validate_child_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_books ub
    where ub.id = new.user_book_id and ub.user_id = new.user_id
  ) then
    raise exception 'Record must belong to the library book owner';
  end if;
  return new;
end;
$$;

create trigger reviews_validate_owner
  before insert or update on public.reviews
  for each row execute function public.validate_child_owner();
create trigger reading_sessions_validate_owner
  before insert or update on public.reading_sessions
  for each row execute function public.validate_child_owner();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.shelves enable row level security;
alter table public.shelf_books enable row level security;
alter table public.reviews enable row level security;
alter table public.reading_sessions enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Book catalog is publicly readable"
  on public.books for select using (true);
create policy "Authenticated users add catalog books"
  on public.books for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "Creators update catalog books"
  on public.books for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users manage their own library"
  on public.user_books for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners and visitors read shelves"
  on public.shelves for select
  using (is_public or (select auth.uid()) = user_id);
create policy "Users create their own shelves"
  on public.shelves for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own shelves"
  on public.shelves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own shelves"
  on public.shelves for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners and visitors read shelf books"
  on public.shelf_books for select
  using (exists (
    select 1 from public.shelves s
    where s.id = shelf_id
      and (s.is_public or s.user_id = (select auth.uid()))
  ));
create policy "Owners add shelf books"
  on public.shelf_books for insert to authenticated
  with check (exists (
    select 1 from public.shelves s
    where s.id = shelf_id and s.user_id = (select auth.uid())
  ));
create policy "Owners update shelf books"
  on public.shelf_books for update to authenticated
  using (exists (
    select 1 from public.shelves s
    where s.id = shelf_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.shelves s
    where s.id = shelf_id and s.user_id = (select auth.uid())
  ));
create policy "Owners remove shelf books"
  on public.shelf_books for delete to authenticated
  using (exists (
    select 1 from public.shelves s
    where s.id = shelf_id and s.user_id = (select auth.uid())
  ));

create policy "Public reviews and owners can read reviews"
  on public.reviews for select
  using (visibility = 'public' or (select auth.uid()) = user_id);
create policy "Users create their own reviews"
  on public.reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own reviews"
  on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own reviews"
  on public.reviews for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users manage their own reading sessions"
  on public.reading_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
