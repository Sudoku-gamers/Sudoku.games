// Run from the repository root:  node server/tests/frontend-forfeit.test.mjs
// Pulls the real forfeit helpers out of app.js and runs them with stubbed Vatar SDK / fetch / timers.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const appJs = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'app.js'), 'utf8');
const start = appJs.indexOf('const postVatarForfeit = async');
const end = appJs.indexOf('const vatarEndGameBase = endGame;');
if (start < 0 || end < 0 || end < start) { console.log('FAIL could not locate the forfeit helpers in app.js'); process.exit(1); }
const snippet = appJs.slice(start, end);

let failed = 0;
const check = (name, ok, got) => { console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : '-> ' + JSON.stringify(got)); if (!ok) failed++; };

function load({ matchId = 'm1', playerId = 'p_alice', sessionFn, responses }) {
  const calls = [];
  const queue = [...responses];
  const sandbox = {
    window: {}, console: { warn() {}, error() {}, log() {} }, AbortController, clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, ms > 1000 ? 1 : ms),            // collapse the 2.5s retry pause for the test
    V: { session: sessionFn || (async () => ({ session: 'sess-x' })) },
    activeVatarMatch: matchId ? { id: matchId } : null, vatarRelayMatchId: null,
    vatarPlayer: playerId ? { id: playerId } : null,
    fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.body };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(snippet, sandbox);
  return { w: sandbox.window, calls };
}

// missing ids: no request is sent
{ const { w, calls } = load({ matchId: null, responses: [] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('no active match -> no_active_vatar_match, nothing sent', r.success === false && r.error === 'no_active_vatar_match' && calls.length === 0, { r, calls }); }
{ const { w, calls } = load({ playerId: null, responses: [] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('no player id -> no_active_vatar_match, nothing sent', r.error === 'no_active_vatar_match' && calls.length === 0, { r, calls }); }
// session unavailable
{ const { w, calls } = load({ sessionFn: async () => { throw Object.assign(new Error('x'), { code: 'not_framed' }); }, responses: [] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('session read fails -> error code surfaced, nothing sent', r.success === false && r.error === 'not_framed' && calls.length === 0, { r, calls }); }
// success: sends the right body to the nhkl route, with no client-chosen winner
{ const { w, calls } = load({ responses: [{ status: 200, body: { success: true, winner: 'p_bob' } }] });
  const r = await w.sudokuSubmitVatarForfeit('mistake_limit');
  check('success returns server result', r.success === true && r.winner === 'p_bob', r);
  check('request goes to the forfeit route with session, matchId, defeatedPlayerId', calls.length === 1 && calls[0].url === 'https://sudoku-games-nhkl.onrender.com/api/vatar/match/forfeit' && calls[0].body.matchId === 'm1' && calls[0].body.defeatedPlayerId === 'p_alice' && calls[0].body.session === 'sess-x' && !('winner' in calls[0].body), calls); }
// definitive server refusal: not retried, status and code kept
{ const { w, calls } = load({ responses: [{ status: 403, body: { error: 'not_active_two_player_match' } }] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('403 refusal is not retried and keeps status+code', r.success === false && r.status === 403 && r.error === 'not_active_two_player_match' && calls.length === 1, { r, calls: calls.length }); }
// signing rejected: deterministic, not retried
{ const { w, calls } = load({ responses: [{ status: 502, body: { error: 'result_signing_rejected', upstream: { http: 401, error: 'bad_signature' } } }] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('result_signing_rejected is not retried', calls.length === 1 && r.error === 'result_signing_rejected', { r, calls: calls.length }); }
// cold start / network failure: retried once, then succeeds
{ const { w, calls } = load({ responses: [new TypeError('Failed to fetch'), { status: 200, body: { success: true, winner: 'p_bob' } }] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('network failure is retried once and can succeed', r.success === true && calls.length === 2, { r, calls: calls.length }); }
// gateway 502 with no JSON body (Render waking up): retried
{ const { w, calls } = load({ responses: [{ status: 502, body: {} }, { status: 200, body: { success: true, winner: 'p_bob' } }] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('bare 502 is retried once', r.success === true && calls.length === 2, { r, calls: calls.length }); }
// persistent failure: exactly one retry, then an honest failure
{ const { w, calls } = load({ responses: [new TypeError('Failed to fetch'), new TypeError('Failed to fetch')] });
  const r = await w.sudokuSubmitVatarForfeit();
  check('persistent network failure -> 2 attempts, success:false', r.success === false && r.error === 'network_error' && calls.length === 2, { r, calls: calls.length }); }
// 404 from a stale server is reported as such, never as success
{ const { w } = load({ responses: [{ status: 404, body: { error: 'not_found' } }] });
  const r = await w.sudokuSubmitVatarForfeit();
  const msg = w.sudokuVatarForfeitMessage(r);
  check('404 not_found -> failure, message names the outdated deployment', r.success === false && /outdated deployment|result route/i.test(msg) && msg.includes('HTTP 404'), { r, msg }); }
// messages never claim success and always include the debugging code
{ const { w } = load({ responses: [] });
  const m1 = w.sudokuVatarForfeitMessage({ success: false, status: 502, error: 'result_signing_rejected', upstream: { http: 401, error: 'bad_signature' } });
  check('message for rejected signature includes HTTP, code and upstream code', m1.includes('HTTP 502') && m1.includes('result_signing_rejected') && m1.includes('bad_signature'), m1);
  const m2 = w.sudokuVatarForfeitMessage({ success: false, error: 'no_active_vatar_match' });
  check('message for missing match is specific', /No active Lagos Life match/.test(m2) && m2.includes('no_active_vatar_match'), m2);
  const m3 = w.sudokuVatarForfeitMessage({ success: false });
  check('message for unknown failure says not recorded', /not recorded/.test(m3), m3); }

console.log(failed ? `\n${failed} test(s) FAILED` : '\nAll frontend forfeit tests passed');
process.exit(failed ? 1 : 0);
