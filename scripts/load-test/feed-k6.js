/**
 * Load test PIH Pulse — feed + listes (k6)
 *
 * Usage:
 *   export SUPABASE_URL="https://xxx.supabase.co"
 *   export SUPABASE_ANON_KEY="eyJ..."
 *   k6 run scripts/load-test/feed-k6.js
 *
 * Cibles smoke : p95 < 800ms feed, erreurs < 1%, 20–50 VUs
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.SUPABASE_URL;
const KEY = __ENV.SUPABASE_ANON_KEY;

const errorRate = new Rate('errors');
const feedLatency = new Trend('feed_latency_ms', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.01'],
    feed_latency_ms: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
}

export default function () {
  if (!BASE || !KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');
    errorRate.add(1);
    return;
  }

  // 1) Feed unifié (ou posts si hub_feed absent)
  let res = http.get(
    `${BASE}/rest/v1/hub_feed?select=id,item_type,item_id,boost_count,created_at&order=boost_count.desc,created_at.desc&limit=30`,
    { headers: headers() }
  );
  if (res.status === 404 || res.status === 400) {
    res = http.get(
      `${BASE}/rest/v1/posts?select=id,created_at&order=created_at.desc&limit=30`,
      { headers: headers() }
    );
  }
  feedLatency.add(res.timings.duration);
  const okFeed = check(res, { 'feed 200': (r) => r.status === 200 });
  errorRate.add(!okFeed);

  // 2) Projets page
  const proj = http.get(
    `${BASE}/rest/v1/projects?select=id,name,created_at&order=created_at.desc&limit=20`,
    { headers: headers() }
  );
  const okProj = check(proj, { 'projects 200': (r) => r.status === 200 });
  errorRate.add(!okProj);

  // 3) Engagement counts batch-ish
  const eng = http.get(
    `${BASE}/rest/v1/engagement_counts?select=ref_id,boosts&limit=50`,
    { headers: headers() }
  );
  // table peut manquer si pas encore migré
  if (eng.status !== 200 && eng.status !== 404 && eng.status !== 400) {
    errorRate.add(1);
  }

  sleep(1);
}
