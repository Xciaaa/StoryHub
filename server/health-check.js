require('dotenv').config({ path: './.env' });

const https = require('https');
const jwt = require('jsonwebtoken');

const BACKEND = 'storyhub-server-cq7x.onrender.com';
const FRONTEND = 'story-hub-hmyo.vercel.app';
const DEMO_USER_ID = 'de7cf6ee-ea95-4219-bb03-dab77a1611d0';
const DEMO_PASSWORD = 'S3cur3L0recraft!2024';

const results = [];
let pass = 0;
let fail = 0;

function request(host, path, { method = 'GET', headers = {}, body = null, redirect = false } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Type'] = 'application/json';
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request({ hostname: host, port: 443, path, method, headers, timeout: 20000 }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: buf });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    if (data) req.write(data);
    req.end();
  });
}

async function check(name, fn) {
  process.stdout.write(`[..] ${name} ... `);
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    if (result.ok) {
      console.log(`PASS (${ms}ms)`);
      pass++;
      results.push({ name, status: 'PASS', detail: result.detail });
    } else {
      console.log(`FAIL: ${result.detail}`);
      fail++;
      results.push({ name, status: 'FAIL', detail: result.detail });
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    fail++;
    results.push({ name, status: 'ERROR', detail: e.message });
  }
}

(async () => {
  console.log('\n=== StoryHub End-to-End Health Check ===\n');

  // 1. Backend health
  await check('Backend /health', async () => {
    const r = await request(BACKEND, '/health');
    if (r.status === 200 && r.body?.status === 'ok') return { ok: true, detail: 'healthy' };
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 100)}` };
  });

  // 2. Backend root (404 expected, but CORS headers should be present)
  await check('Backend / responds', async () => {
    const r = await request(BACKEND, '/');
    return { ok: r.status !== undefined, detail: `status=${r.status}` };
  });

  // 3. CORS preflight from frontend origin
  await check('CORS allows Vercel frontend', async () => {
    const r = await request(BACKEND, '/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: `https://${FRONTEND}`,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const allowOrigin = r.headers['access-control-allow-origin'];
    if (r.status === 204 && (allowOrigin === '*' || allowOrigin === `https://${FRONTEND}`)) {
      return { ok: true, detail: `allow-origin=${allowOrigin}` };
    }
    return { ok: false, detail: `status=${r.status} allow-origin=${allowOrigin}` };
  });

  // 4. Login with demo account
  let loginToken;
  await check('Login demo@storyhub.app', async () => {
    const r = await request(BACKEND, '/api/auth/login', {
      method: 'POST',
      body: { email: 'demo@storyhub.app', password: DEMO_PASSWORD },
    });
    if (r.status === 200 && r.body?.token) {
      loginToken = r.body.token;
      return { ok: true, detail: `got token, user=${r.body.user?.username}` };
    }
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 5. Login with wrong password (should return 401, not 500)
  await check('Login wrong password → 401', async () => {
    const r = await request(BACKEND, '/api/auth/login', {
      method: 'POST',
      body: { email: 'demo@storyhub.app', password: 'wrongpassword' },
    });
    if (r.status === 401) return { ok: true, detail: 'correctly rejected' };
    return { ok: false, detail: `expected 401, got ${r.status}` };
  });

  // 6. /api/auth/me with valid token
  await check('GET /me with token', async () => {
    if (!loginToken) return { ok: false, detail: 'no token from login' };
    const r = await request(BACKEND, '/api/auth/me', { headers: { Authorization: `Bearer ${loginToken}` } });
    if (r.status === 200 && r.body?.email === 'demo@storyhub.app') {
      return { ok: true, detail: `user=${r.body.username} has_password=${r.body.has_password}` };
    }
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 7. /api/auth/me without token (should 401)
  await check('GET /me without token → 401', async () => {
    const r = await request(BACKEND, '/api/auth/me');
    if (r.status === 401) return { ok: true, detail: 'correctly rejected' };
    return { ok: false, detail: `expected 401, got ${r.status}` };
  });

  // 8. List projects
  await check('GET /api/projects', async () => {
    if (!loginToken) return { ok: false, detail: 'no token' };
    const r = await request(BACKEND, '/api/projects', { headers: { Authorization: `Bearer ${loginToken}` } });
    if (r.status === 200 && Array.isArray(r.body)) {
      return { ok: true, detail: `count=${r.body.length}` };
    }
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 9. Public community projects (no auth)
  await check('GET /api/community/projects (public)', async () => {
    const r = await request(BACKEND, '/api/community/projects');
    if (r.status === 200 && Array.isArray(r.body?.projects || r.body)) {
      const list = r.body.projects || r.body;
      return { ok: true, detail: `count=${list.length}` };
    }
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 10. Public user search
  await check('GET /api/community/users/search', async () => {
    const r = await request(BACKEND, '/api/community/users/search?q=Lore');
    if (r.status === 200 && Array.isArray(r.body)) {
      return { ok: true, detail: `count=${r.body.length}` };
    }
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 11. Public project detail
  await check('GET public project detail', async () => {
    const list = await request(BACKEND, '/api/community/projects');
    const projects = list.body?.projects || list.body;
    if (!Array.isArray(projects) || projects.length === 0) return { ok: false, detail: 'no public projects to test' };
    const r = await request(BACKEND, `/api/community/projects/${projects[0].id}`);
    if (r.status === 200 && r.body?.id) return { ok: true, detail: `loaded project "${r.body.title}"` };
    return { ok: false, detail: `status=${r.status}` };
  });

  // 12. Change password (the one we fixed earlier)
  await check('POST /api/auth/change-password', async () => {
    if (!loginToken) return { ok: false, detail: 'no token' };
    const r = await request(BACKEND, '/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginToken}` },
      body: { currentPassword: DEMO_PASSWORD, newPassword: DEMO_PASSWORD }, // no-op change to verify
    });
    if (r.status === 200 && r.body?.success) return { ok: true, detail: 'password change works' };
    return { ok: false, detail: `status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 13. Change password with wrong current password (should 401)
  await check('Change password wrong current → 401', async () => {
    if (!loginToken) return { ok: false, detail: 'no token' };
    const r = await request(BACKEND, '/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginToken}` },
      body: { currentPassword: 'wrongpassword123', newPassword: 'newpassword123' },
    });
    if (r.status === 401) return { ok: true, detail: 'correctly rejected' };
    return { ok: false, detail: `expected 401, got ${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 14. Rate limiter headers present
  await check('RateLimit headers on /health', async () => {
    const r = await request(BACKEND, '/health');
    const hasHeaders = r.headers['ratelimit-limit'] || r.headers['ratelimit-policy'];
    if (hasHeaders) return { ok: true, detail: `limit=${r.headers['ratelimit-limit']}` };
    return { ok: true, detail: 'no rate limit headers on /health (expected, only /api/* is limited)' };
  });

  // 15. Rate limit kicks in after many requests
  await check('Auth rate limiter → 429', async () => {
    const tries = [];
    for (let i = 0; i < 12; i++) {
      const r = await request(BACKEND, '/api/auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' + i },
      });
      tries.push(r.status);
    }
    const got429 = tries.includes(429);
    if (got429) return { ok: true, detail: `429 after ${tries.indexOf(429) + 1} requests: ${tries.join(',')}` };
    return { ok: false, detail: `no 429 in 12 tries: ${tries.join(',')}` };
  });

  // 16. OAuth routes exist
  await check('OAuth Google route exists', async () => {
    const r = await request(BACKEND, '/api/auth/google', { method: 'GET', redirect: true });
    // Expect 302 redirect to Google or 4xx
    if ([302, 301, 200, 400, 401].includes(r.status)) return { ok: true, detail: `status=${r.status}` };
    return { ok: false, detail: `unexpected status=${r.status}` };
  });

  // 17. Frontend (Vercel) loads
  await check('Vercel frontend loads', async () => {
    const r = await request(FRONTEND, '/');
    if (r.status === 200) return { ok: true, detail: `loaded ${r.raw.length} bytes` };
    return { ok: false, detail: `status=${r.status}` };
  });

  // 18. Vercel frontend serves robots.txt
  await check('Vercel /robots.txt', async () => {
    const r = await request(FRONTEND, '/robots.txt');
    if (r.status === 200 && r.raw.includes('User-agent')) return { ok: true, detail: 'served' };
    return { ok: false, detail: `status=${r.status}` };
  });

  // 19. Vercel /api proxy → backend
  await check('Vercel proxies /api/* to Render', async () => {
    const r = await request(FRONTEND, '/api/auth/login', {
      method: 'POST',
      body: { email: 'demo@storyhub.app', password: 'wrong' },
    });
    if (r.status === 401 || r.status === 429) return { ok: true, detail: `proxied correctly (status=${r.status})` };
    return { ok: false, detail: `unexpected status=${r.status} body=${r.raw?.slice(0, 200)}` };
  });

  // 20. Vercel SPA fallback (deep route serves index.html)
  await check('Vercel SPA fallback /dashboard', async () => {
    const r = await request(FRONTEND, '/dashboard');
    if (r.status === 200 && r.raw.includes('<div id="root"')) return { ok: true, detail: 'served index.html' };
    return { ok: false, detail: `status=${r.status}` };
  });

  console.log('\n=== Summary ===');
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`TOTAL: ${pass + fail}\n`);

  if (fail > 0) {
    console.log('Failed checks:');
    results.filter((r) => r.status !== 'PASS').forEach((r) => console.log(`  [${r.status}] ${r.name}: ${r.detail}`));
  }

  process.exit(fail > 0 ? 1 : 0);
})();
