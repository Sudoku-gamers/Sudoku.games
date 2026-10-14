# Lagos Life result submission connection fix

## What was wrong
The browser sends a CORS preflight `OPTIONS` request before the JSON `POST` to
`/api/vatar/match/forfeit`. The companion server did not answer preflight requests
or attach CORS response headers, so the browser could stop before sending the
actual result request. That explains why the result request might not appear in
the Render logs.

## Files
- `server/server.js`: allowlisted CORS for `https://sudoku-gamers.github.io`,
  the Render origin, and `https://lagoslife.app`; handles OPTIONS preflight and
  logs when the forfeit route is reached or Lagos Life rejects/accepts settlement.
- `app.js`: already targets the Render API URL for Vatar calls.

## Deploy
1. In the same GitHub repository connected to Render, replace `server/server.js`
   with the version in this ZIP. Keep the file in the `server` folder.
2. Ensure `app.js` in the repository is the included version too.
3. Commit the changes. Wait for Render to redeploy (this backend fix must reach
   Render, not only GitHub Pages).
4. Once Render says the deployment is live, open the game from the Lagos Life
   sandbox and run a zero-stake friendly test.

## Verify
A browser preflight from `https://sudoku-gamers.github.io` to
`/api/vatar/match/forfeit` should return HTTP 204 with
`Access-Control-Allow-Origin: https://sudoku-gamers.github.io`.
The server logs should show `[CORS] preflight accepted` and, if the POST reaches
the route, `[Vatar] forfeit request received`.

This fixes the browser-to-server CORS/preflight layer. It does not guarantee that
Lagos Life accepts a signed match result; the response/logs will distinguish a
CORS issue from missing credentials, invalid match/session, or a rejected signed
result. Keep all matches zero-stake until the full settlement path is confirmed.
