# Room connection fix

This patch improves room-code joining and exposes the actual failure instead of incorrectly reporting every non-`waiting` room as unavailable. Joining now validates the room data, handles reserved matchmaking rooms, and uses a conditional update so two clients cannot both claim the same waiting room. Join failures are logged with `[Join room]` details in the browser console.

## Required Supabase step

The app code cannot change the policies installed in your hosted Supabase database. Before testing the patched app, open **Supabase Dashboard → SQL Editor**, paste and run `room_connection_fix.sql` from this folder, and confirm it completes successfully. This creates/refreshes the room ownership columns and RLS policies used by both manual room codes and matchmaking. Back up your project/database before applying changes.

## Test

1. Deploy the patched project.
2. Sign in on two separate browser profiles/devices.
3. On device A, create a room and copy the six-character code.
4. On device B, enter the code. Both screens should enter the same game.
5. Repeat with Quick Pairing.
6. If either fails, inspect the browser console for `[Join room]` or `[Realtime]` messages; do not share Supabase secret/service-role keys.

This patch has been syntax-checked locally, but cannot be verified against your live Supabase project without access to that project's actual schema, policies, and runtime.
