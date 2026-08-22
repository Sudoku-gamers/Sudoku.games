-- ============================================================
-- SECURITY MIGRATION — run this in Supabase → SQL Editor
-- ============================================================
-- What this does:
--   1. Enables Row Level Security properly on every table the app
--      touches (several currently have NO restriction — anyone with
--      the public anon key, which is visible in app.js, can read,
--      write, or delete ANY row).
--   2. Adds host_id/guest_id ownership columns to sudoku_rooms so
--      writes can be tied to the real signed-in/anonymous user
--      instead of trusted blindly.
--   3. Ties every write to auth.uid() — which now exists for every
--      visitor (including guests) once you enable Anonymous
--      Sign-ins (step 0 below), since app.js was updated to call
--      supabaseClient.auth.signInAnonymously() automatically.
--
-- BEFORE RUNNING THIS: enable Anonymous Sign-ins in your Supabase
-- project — Dashboard → Authentication → Providers → Anonymous
-- Sign-ins → toggle ON. This can only be done in the dashboard,
-- not via SQL.
-- ============================================================


-- ------------------------------------------------------------
-- 0. profiles: make sure every new auth user (including
--    anonymous ones) automatically gets a profile row.
--    Adjust the column list to match what you actually store —
--    this assumes id, username, rating, avatar_emoji exist
--    already (used throughout app.js).
-- ------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, rating)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Player' || substr(new.id::text, 1, 4)),
    2.0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table profiles enable row level security;

drop policy if exists "profiles are publicly readable" on profiles;
create policy "profiles are publicly readable"
  on profiles for select using (true);

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 1. sudoku_rooms — add real ownership columns, lock down writes
-- ------------------------------------------------------------
alter table sudoku_rooms add column if not exists host_id uuid references auth.users(id);
alter table sudoku_rooms add column if not exists guest_id uuid references auth.users(id);

alter table sudoku_rooms enable row level security;

-- Remove the old "anyone can do anything" policy if it exists
drop policy if exists "public rw" on sudoku_rooms;

drop policy if exists "rooms are publicly readable" on sudoku_rooms;
create policy "rooms are publicly readable"
  on sudoku_rooms for select using (true);   -- needed for join-by-code + lobby stats

drop policy if exists "only creator can create a room as themselves" on sudoku_rooms;
create policy "only creator can create a room as themselves"
  on sudoku_rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "only participants can update a room" on sudoku_rooms;
create policy "only participants can update a room"
  on sudoku_rooms for update
  using (guest_id is null or auth.uid() in (host_id, guest_id))   -- allows joining an open room
  with check (auth.uid() in (host_id, guest_id));                 -- after update, must be a real participant

drop policy if exists "only participants can delete a room" on sudoku_rooms;
create policy "only participants can delete a room"
  on sudoku_rooms for delete
  using (auth.uid() in (host_id, guest_id));


-- ------------------------------------------------------------
-- 2. matchmaking_queue — create if it doesn't already exist
--    (this table had NO SQL file in the repo at all)
-- ------------------------------------------------------------
create table if not exists matchmaking_queue (
    id bigint generated always as identity primary key,
    player_id text not null,      -- text, not uuid: signal rows append "_match"
    player_name text,
    rating numeric default 2.0,
    time_limit integer,
    game_mode text,
    difficulty text,
    joined_at timestamptz default now()
);

alter table matchmaking_queue enable row level security;

drop policy if exists "queue is publicly readable" on matchmaking_queue;
create policy "queue is publicly readable"
  on matchmaking_queue for select using (true);   -- needed to browse for opponents

drop policy if exists "users manage only their own queue entries" on matchmaking_queue;
create policy "users manage only their own queue entries"
  on matchmaking_queue for insert
  with check (player_id = auth.uid()::text or player_id = auth.uid()::text || '_match');

drop policy if exists "users delete only their own queue entries" on matchmaking_queue;
create policy "users delete only their own queue entries"
  on matchmaking_queue for delete
  using (player_id = auth.uid()::text or player_id = auth.uid()::text || '_match');

-- Sweep stale queue entries older than 5 minutes (run manually, or
-- schedule with pg_cron if enabled on your project)
-- delete from matchmaking_queue where joined_at < now() - interval '5 minutes';


-- ------------------------------------------------------------
-- 3. tournaments — replace the old wide-open update policy
-- ------------------------------------------------------------
alter table tournaments add column if not exists status text default 'waiting';
alter table tournaments add column if not exists current_round integer default 0;

alter table tournaments enable row level security;

drop policy if exists "public read tournaments" on tournaments;
create policy "tournaments are publicly readable"
  on tournaments for select using (true);

drop policy if exists "public update player_count" on tournaments;
drop policy if exists "authenticated users can create tournaments" on tournaments;
create policy "signed-in users can create tournaments"
  on tournaments for insert
  with check (auth.uid() = creator_id);

drop policy if exists "only creator can update their tournament" on tournaments;
create policy "only creator can update their tournament"
  on tournaments for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "only creator can delete their tournament" on tournaments;
create policy "only creator can delete their tournament"
  on tournaments for delete
  using (auth.uid() = creator_id);

-- Player-count increments still go through the existing
-- security-definer RPC (increment_tournament_count), which is
-- safe to keep callable by any signed-in user since it only
-- increments and checks ends_at > now().
grant execute on function increment_tournament_count(uuid) to authenticated;


-- ------------------------------------------------------------
-- 4. tournament_participants
-- ------------------------------------------------------------
create table if not exists tournament_participants (
    id bigint generated always as identity primary key,
    tournament_id uuid references tournaments(id) on delete cascade,
    player_id uuid references auth.users(id),
    player_name text,
    player_rating numeric,
    score numeric default 0,
    games_played integer default 0
);

alter table tournament_participants enable row level security;

drop policy if exists "participants are publicly readable" on tournament_participants;
create policy "participants are publicly readable"
  on tournament_participants for select using (true);

drop policy if exists "users can join as themselves" on tournament_participants;
create policy "users can join as themselves"
  on tournament_participants for insert
  with check (auth.uid() = player_id);

drop policy if exists "users can update their own entry" on tournament_participants;
create policy "users can update their own entry"
  on tournament_participants for update
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

drop policy if exists "users can leave their own entry" on tournament_participants;
create policy "users can leave their own entry"
  on tournament_participants for delete
  using (auth.uid() = player_id);


-- ------------------------------------------------------------
-- 5. tournament_matches — bracket rows, written only by the
--    tournament creator when a round launches/advances
-- ------------------------------------------------------------
create table if not exists tournament_matches (
    id bigint generated always as identity primary key,
    tournament_id uuid references tournaments(id) on delete cascade,
    round integer,
    player1_id uuid references auth.users(id),
    player2_id uuid references auth.users(id),
    room_id text,
    winner_id uuid references auth.users(id),
    status text default 'pending'
);

alter table tournament_matches enable row level security;

drop policy if exists "matches are publicly readable" on tournament_matches;
create policy "matches are publicly readable"
  on tournament_matches for select using (true);

drop policy if exists "only tournament creator can write matches" on tournament_matches;
create policy "only tournament creator can write matches"
  on tournament_matches for insert
  with check (
    exists (select 1 from tournaments t where t.id = tournament_id and t.creator_id = auth.uid())
  );

drop policy if exists "match participants or creator can update" on tournament_matches;
create policy "match participants or creator can update"
  on tournament_matches for update
  using (
    auth.uid() in (player1_id, player2_id)
    or exists (select 1 from tournaments t where t.id = tournament_id and t.creator_id = auth.uid())
  );


-- ------------------------------------------------------------
-- 6. friendships
-- ------------------------------------------------------------
create table if not exists friendships (
    id bigint generated always as identity primary key,
    requester_id uuid references auth.users(id),
    addressee_id uuid references auth.users(id),
    status text default 'pending',
    created_at timestamptz default now(),
    unique (requester_id, addressee_id)
);

alter table friendships enable row level security;

drop policy if exists "users see friendships they're part of" on friendships;
create policy "users see friendships they're part of"
  on friendships for select
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "users can send requests as themselves" on friendships;
create policy "users can send requests as themselves"
  on friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "either side can update the friendship" on friendships;
create policy "either side can update the friendship"
  on friendships for update
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "either side can delete the friendship" on friendships;
create policy "either side can delete the friendship"
  on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));


-- ------------------------------------------------------------
-- Realtime (safe to re-run; ignore "already a member" errors)
-- ------------------------------------------------------------
alter publication supabase_realtime add table sudoku_rooms;
alter publication supabase_realtime add table tournaments;
alter publication supabase_realtime add table tournament_matches;
alter publication supabase_realtime add table tournament_participants;
