# Five-mistake forfeit: result settlement fix

## What this change does
- `server/server.js`
  - `/api/vatar/match/forfeit` reads the match fresh from Lagos Life (no 5-second cache) before deciding anything.
  - Separates "Lagos Life could not be reached" (502 `lagos_life_unreachable`) from "Lagos Life rejected it"
    (502 `result_signing_rejected` for 401, 409 `already_settled`, 409 `match_not_playing`) and from missing
    credentials (503 `server_not_configured`). Only the upstream HTTP status and error code are returned, never the full upstream body.
  - Every call to Lagos Life now has a 10-second timeout and returns a structured error instead of throwing.
  - A retry after a lost response is a safe success: if the match is already `done` and Lagos Life's own record
    names the opponent as winner, it answers `{success:true, alreadySettled:true}`. A caller who actually won can never be turned into the loser.
  - `/healthz` now shows `build`, `forfeitRoute` and `resultsConfigured` (a yes/no, never a value).
  - Unchanged: the winner is always the other verified player of the verified match; a client-supplied winner is ignored.
- `app.js`
  - The forfeit request has a 25-second timeout and one retry, only for "could not reach it" outcomes.
  - The failure toast now says what happened and shows a short code, for example
    `Five mistakes reached. The game server does not have the result route (outdated deployment). [HTTP 404 not_found]`.
  - The match-start toast no longer says settlement is not enabled.
- `server/tests/*` and `server/package.json`: tests (below).

## Deploy
1. Copy these files into the same GitHub repository that Render builds from, at the same paths:
   `app.js`, `server/server.js`, `server/package.json`, `server/tests/*`, `DEPLOY-RENDER.md`, `FORFEIT-FIX.md`.
2. Deploy the Render service **sudoku-games-nhkl** (the only one the game calls). In Render: the service, then Manual Deploy, then
   "Deploy latest commit". Do not change any environment variable.
3. If the game is also hosted on GitHub Pages, push the same `app.js` there too (it updates by itself).

## Test it
1. Open `https://sudoku-games-nhkl.onrender.com/healthz`. It must show `"build":"forfeit-fix-2026-10-14"` and `"resultsConfigured":true`.
   - No `build` field: Render is still on old code. Check the service's repository, branch and Auto-Deploy, and deploy again.
   - `resultsConfigured:false`: a secret is missing on that service.
2. Open the game from the Lagos Life sandbox on two devices or accounts, start a friendly match, and make 5 wrong entries on one of them.
3. Read the toast:
   - "Recording the match result…" followed by no failure toast means Lagos Life accepted the result.
   - A failure toast now shows `[HTTP status code]`. That code is the answer; send it to me.
4. In the Lagos Life developer dashboard, check that the match shows as settled.

## Automated tests (dummy secrets, mocked Lagos Life, no network)
`cd server && npm test`
