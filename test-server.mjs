// Run with: node server/test-server.mjs   (from the project folder)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8123;
const child = spawn(process.execPath, [path.join(here, 'server', 'server.js')], { env: { ...process.env, PORT: String(PORT), VATAR_SECRET: 'vtr_test_UNIT_TEST' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
let failed = 0;
const check = async (route, wantStatus, extra) => {
  const res = await fetch(`http://localhost:${PORT}${route}`);
  const ok = res.status === wantStatus && (!extra || extra(res));
  console.log(ok ? 'PASS' : 'FAIL', route, '->', res.status, '(want', wantStatus + ')');
  if (!ok) failed++;
};
try {
  await check('/healthz', 200);
  await check('/', 200, r => (r.headers.get('content-security-policy') || '').startsWith('frame-ancestors https://lagoslife.app'));
  await check('/app.js', 200);
  await check('/manifest.json', 200);
  await check('/server/server.js', 404);
  await check('/server/.env', 404);
  await check('/server/.env.example', 404);
  await check('/security_migration.sql', 404);
  await check('/README.md', 404);
  await check('/api/vatar/challenges', 200);
} finally { child.kill(); }
console.log(failed ? `${failed} test(s) FAILED` : 'All tests passed');
process.exit(failed ? 1 : 0);
import crypto from 'crypto';

export async function uploadMatchResult(match, winnerId) {
    const ts = String(Math.floor(Date.now() / 1000));
    const path = `/api/games/v1/matches/${match.id}/result`;
    const body = JSON.stringify({ winner: winnerId }); // playerId or "draw"
    
    const sha = crypto.createHash("sha256").update(body).digest("hex");
    const sig = "v1=" + crypto.createHmac("sha256", process.env.VATAR_RESULTS_SECRET)
      .update(["POST", path, ts, match.nonce, sha].join("\n")).digest("hex");

    const response = await fetch(process.env.VATAR_API + path, { 
        method: "POST", 
        body, 
        headers: {
            Authorization: `Bearer ${process.env.VATAR_SECRET}`, 
            "Content-Type": "application/json",
            "X-Vatar-Timestamp": ts, 
            "X-Vatar-Signature": sig 
        } 
    });

    return await response.json();
}
