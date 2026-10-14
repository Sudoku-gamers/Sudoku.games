// Run from the repository root:  node server/tests/forfeit.test.mjs
// Starts server/server.js with DUMMY secrets and a mocked Lagos Life API (see mock-vatar.mjs).
// No real credentials and no network access are used.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, '..', 'server.js');
const mockPath = path.join(here, 'mock-vatar.mjs');
let failed = 0;

async function startServer(port, extraEnv) {
  const env = { ...process.env, PORT: String(port), VATAR_SECRET: 'vtr_test_DUMMY', VATAR_RESULTS_SECRET: 'vtr_rsec_test_DUMMY', ...extraEnv };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const child = spawn(process.execPath, ['--import', mockPath, serverPath], { env, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  return child;
}
const check = (name, ok, got) => {
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : '-> ' + JSON.stringify(got));
  if (!ok) failed++;
};

// ---------- normal server: secrets configured ----------
const PORT = 8200 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}`;
const server = await startServer(PORT);
const forfeit = (body) => fetch(`${BASE}/api/vatar/match/forfeit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const expectForfeit = async (name, body, status, fields = {}) => {
  const got = await forfeit(body);
  check(name, got.status === status && Object.entries(fields).every(([k, v]) => got.body[k] === v), got);
  return got;
};

try {
  // --- missing / invalid input ---
  await expectForfeit('missing session and player id -> 400', { matchId: 'm_play' }, 400, { error: 'invalid_request' });
  await expectForfeit('missing match id -> 400', { session: 'sess-alice', defeatedPlayerId: 'p_alice' }, 400, { error: 'invalid_request' });
  // --- invalid session / upstream down during session check ---
  await expectForfeit('invalid session -> 403', { session: 'nope', matchId: 'm_play', defeatedPlayerId: 'p_alice' }, 403, { error: 'invalid_session' });
  await expectForfeit('Lagos Life unreachable on session check -> 502', { session: 'sess-down', matchId: 'm_play', defeatedPlayerId: 'p_alice' }, 502, { error: 'lagos_life_unreachable' });
  // --- inactive / unknown matches, wrong participant ---
  await expectForfeit('unknown match -> 403', { session: 'sess-alice', matchId: 'zzz', defeatedPlayerId: 'p_alice' }, 403, { error: 'not_active_two_player_match' });
  await expectForfeit('open (not started) match -> 403', { session: 'sess-alice', matchId: 'm_open', defeatedPlayerId: 'p_alice' }, 403, { error: 'not_active_two_player_match' });
  await expectForfeit('finished match, opponent is the recorded winner -> 200 replay', { session: 'sess-alice', matchId: 'm_done', defeatedPlayerId: 'p_alice' }, 200, { success: true, winner: 'p_bob', alreadySettled: true });
  await expectForfeit('finished match, caller actually won -> 409 (cannot be turned into a loss)', { session: 'sess-alice', matchId: 'm_done_won', defeatedPlayerId: 'p_alice' }, 409, { error: 'already_settled' });
  await expectForfeit('caller not in match -> 403', { session: 'sess-eve', matchId: 'm_play', defeatedPlayerId: 'p_eve' }, 403, { error: 'not_active_two_player_match' });
  await expectForfeit('cannot forfeit for the other player -> 403', { session: 'sess-alice', matchId: 'm_play', defeatedPlayerId: 'p_bob' }, 403, { error: 'cannot_forfeit_for_another_player' });
  await expectForfeit('match without nonce -> 409', { session: 'sess-alice', matchId: 'm_nonce', defeatedPlayerId: 'p_alice' }, 409, { error: 'match_result_not_verifiable' });
  // --- failed upstream requests ---
  await expectForfeit('Lagos Life 500 on match lookup -> 502', { session: 'sess-alice', matchId: 'm_500', defeatedPlayerId: 'p_alice' }, 502, { error: 'lagos_life_unreachable' });
  await expectForfeit('network failure on result POST -> 502', { session: 'sess-alice', matchId: 'm_down', defeatedPlayerId: 'p_alice' }, 502, { error: 'lagos_life_unreachable' });
  const bad = await expectForfeit('Lagos Life rejects signature (401) -> 502 result_signing_rejected', { session: 'sess-alice', matchId: 'm_badsig', defeatedPlayerId: 'p_alice' }, 502, { error: 'result_signing_rejected' });
  check('upstream status and code are echoed, nothing else', bad.body.upstream?.http === 401 && bad.body.upstream?.error === 'bad_signature' && Object.keys(bad.body.upstream).length === 2, bad.body);
  await expectForfeit('result already settled differently (409) -> 409', { session: 'sess-alice', matchId: 'm_conflict', defeatedPlayerId: 'p_alice' }, 409, { error: 'already_settled' });
  await expectForfeit('match no longer playing at POST (409) -> 409', { session: 'sess-alice', matchId: 'm_race', defeatedPlayerId: 'p_alice' }, 409, { error: 'match_not_playing' });
  // --- success: the winner comes from the verified match, never from the client ---
  await expectForfeit('success; client-supplied winner ignored', { session: 'sess-alice', matchId: 'm_play', defeatedPlayerId: 'p_alice', winner: 'p_alice' }, 200, { success: true, winner: 'p_bob' });
  await expectForfeit('retry after a lost response is an idempotent success', { session: 'sess-alice', matchId: 'm_play', defeatedPlayerId: 'p_alice' }, 200, { success: true, winner: 'p_bob', alreadySettled: true });
  await expectForfeit('the other player cannot re-submit as the loser of a settled match', { session: 'sess-bob', matchId: 'm_play', defeatedPlayerId: 'p_bob' }, 409, { error: 'already_settled' });

  // --- CORS preflight ---
  const pre = (origin) => fetch(`${BASE}/api/vatar/match/forfeit`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
  for (const [origin, status] of [['https://sudoku-gamers.github.io', 204], ['https://sudoku-games-nhkl.onrender.com', 204], ['https://lagoslife.app', 204], ['https://example.com', 403]]) {
    const r = await pre(origin);
    check(`CORS preflight ${origin} -> ${status}`, r.status === status && (status === 403 || r.headers.get('access-control-allow-origin') === origin), { status: r.status });
  }

  // --- /healthz identifies the build and never leaks secret values ---
  const hz = await fetch(`${BASE}/healthz`); const hzText = await hz.text(); const hzBody = JSON.parse(hzText);
  check('/healthz reports build, forfeit route and secrets-present flag', hz.status === 200 && hzBody.ok === true && typeof hzBody.build === 'string' && hzBody.forfeitRoute === true && hzBody.resultsConfigured === true, hzBody);
  check('/healthz does not contain secret values', !hzText.includes('DUMMY'), hzText);
} finally { server.kill(); }

// ---------- second server: results secret missing ----------
const PORT2 = PORT + 1;
const noSecret = await startServer(PORT2, { VATAR_RESULTS_SECRET: undefined });
try {
  const r = await fetch(`http://localhost:${PORT2}/api/vatar/match/forfeit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: 'sess-alice', matchId: 'm_play', defeatedPlayerId: 'p_alice' }) });
  const body = await r.json();
  check('missing VATAR_RESULTS_SECRET -> 503 server_not_configured', r.status === 503 && body.error === 'server_not_configured', { status: r.status, body });
  const hz = await (await fetch(`http://localhost:${PORT2}/healthz`)).json();
  check('/healthz shows resultsConfigured:false', hz.resultsConfigured === false, hz);
} finally { noSecret.kill(); }

console.log(failed ? `\n${failed} test(s) FAILED` : '\nAll forfeit tests passed');
process.exit(failed ? 1 : 0);
