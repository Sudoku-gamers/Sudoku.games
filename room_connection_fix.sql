-- Sudoku.game room connection repair
-- Run once in Supabase Dashboard > SQL Editor, using the project owner account.
-- This preserves public room-code lookup while restricting room writes to participants.

alter table public.sudoku_rooms
  add column if not exists host_id uuid references auth.users(id),
  add column if not exists guest_id uuid references auth.users(id);

alter table public.sudoku_rooms enable row level security;

drop policy if exists "public rw" on public.sudoku_rooms;
drop policy if exists "rooms are publicly readable" on public.sudoku_rooms;
create policy "rooms are publicly readable"
  on public.sudoku_rooms for select using (true);

drop policy if exists "only creator can create a room as themselves" on public.sudoku_rooms;
create policy "only creator can create a room as themselves"
  on public.sudoku_rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "only participants can update a room" on public.sudoku_rooms;
create policy "only participants can update a room"
  on public.sudoku_rooms for update
  using (guest_id is null or auth.uid() in (host_id, guest_id))
  with check (auth.uid() in (host_id, guest_id));

drop policy if exists "only participants can delete a room" on public.sudoku_rooms;
create policy "only participants can delete a room"
  on public.sudoku_rooms for delete
  using (auth.uid() in (host_id, guest_id));

-- Enable room UPDATE events for realtime clients. Ignore duplicate membership.
do $$ begin
  alter publication supabase_realtime add table public.sudoku_rooms;
exception when duplicate_object then null;
end $$;
