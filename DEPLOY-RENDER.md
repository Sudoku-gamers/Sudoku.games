# Deploying Sudoku.games on Render (plain-English guide)

Render runs your game and its server together on one HTTPS address, which Lagos Life needs.

## Step 1: Put these files on GitHub
1. Unzip the ZIP on your phone or computer.
2. Open github.com/Sudoku-gamers/Sudoku.games, then Add file, then Upload files.
3. Drag in everything INSIDE the unzipped folder (not the ZIP itself). Make sure the `server` folder goes up too.
4. Never upload a file called `.env`. Your secrets are typed into Render, not GitHub.
5. Commit the changes.

## Step 2: Create the service on Render
1. Sign up at render.com with your GitHub account.
2. New, then Blueprint, then pick your Sudoku.games repo. Render reads `render.yaml` for you.
   (If it asks you to set things by hand instead: type Web Service, start command `node server/server.js`, health check path `/healthz`.)
3. Render asks for two values. Paste them there:
   - VATAR_SECRET = your test secret (starts with vtr_test_)
   - VATAR_RESULTS_SECRET = your results secret (starts with vtr_rsec_test_)
4. Deploy. Wait until it says Live. You get an address like https://sudoku-games-xxxx.onrender.com

## Step 3: Check it works
1. Open YOUR-ADDRESS/healthz. You should see {"ok":true,"service":"sudoku-vatar"}.
2. Open YOUR-ADDRESS/server/.env. It must say not_found. If it shows anything else, stop and tell me.

## Step 4: Point Lagos Life at it
1. Lagos Life developer dashboard, then your game, then change the Game URL to your Render address.
2. Open the sandbox and press Reload game.
3. Add three products in the dashboard with exactly these IDs: hints-5, hints-20, theme-gold.
4. Make a test purchase in the sandbox. The checklist ticks the purchase boxes when your server verifies it.

## Notes
- Free Render sleeps when idle. The first load can take about a minute. Fine for testing, too slow for the real review.
- Challenges are kept in server memory, so they vanish when the server restarts.
- Stakes stay locked. Friendly matches only.
- You can pause the Netlify site once the Render address works.
