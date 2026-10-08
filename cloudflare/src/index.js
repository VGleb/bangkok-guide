const ALLOWED_FIELDS = new Set(['fav','planned','visited','seen','rejected','reason','note','rating']);
const ITEM_ID = /^[a-z0-9_-]{2,65}$/;
const EMPTY_UPDATED_AT = '1970-01-01T00:00:00.000Z';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  }
});

const allowedOrigin = (request, env) => {
  const origin = request.headers.get('Origin');
  if (!origin) return '';
  return origin === env.ALLOWED_ORIGIN ? origin : null;
};

const corsHeaders = origin => origin ? {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
} : {};

const authorized = (request, env) => {
  if (!env.API_TOKEN) return false;
  return request.headers.get('Authorization') === `Bearer ${env.API_TOKEN}`;
};

const iso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';

function normalizeRecord(id, record) {
  if (!ITEM_ID.test(id) || !record || typeof record !== 'object' || Array.isArray(record)) return null;
  const fields = {};
  for (const [field, state] of Object.entries(record.fields || {})) {
    if (!ALLOWED_FIELDS.has(field) || !state || typeof state !== 'object') continue;
    const at = iso(state.at);
    if (!at) continue;
    let value = state.value;
    if (field === 'reason' || field === 'note') value = text(value, field === 'reason' ? 100 : 350);
    else if (field === 'rating') {
      if (value !== null && (!Number.isInteger(value) || value < 1 || value > 10)) continue;
    } else if (typeof value !== 'boolean') continue;
    fields[field] = { value, at };
  }
  if (!Object.keys(fields).length) return null;
  return {
    meta: {
      title: text(record.meta?.title, 170),
      kind: text(record.meta?.kind, 45),
      area: text(record.meta?.area, 100)
    },
    fields
  };
}

function recordUpdatedAt(record) {
  return Object.values(record.fields || {}).reduce(
    (latest, state) => state.at > latest ? state.at : latest,
    EMPTY_UPDATED_AT
  );
}

function normalizeDocument(body) {
  if (!body || body.schema !== 1 || !body.records || typeof body.records !== 'object' || Array.isArray(body.records)) {
    throw new Error('Invalid feedback document');
  }

  const entries = Object.entries(body.records);
  if (entries.length > 2000) throw new Error('Too many records');

  const records = {};
  let updatedAt = EMPTY_UPDATED_AT;
  for (const [id, raw] of entries) {
    const record = normalizeRecord(id, raw);
    if (!record) continue;
    records[id] = record;
    const at = recordUpdatedAt(record);
    if (at > updatedAt) updatedAt = at;
  }
  return { schema: 1, app: 'bangkok-curated', updatedAt, records };
}

function mergeDocuments(base, incoming) {
  const records = structuredClone(base.records || {});
  for (const [id, next] of Object.entries(incoming.records || {})) {
    const current = records[id];
    if (!current) {
      records[id] = structuredClone(next);
      continue;
    }

    const currentUpdatedAt = recordUpdatedAt(current);
    const nextUpdatedAt = recordUpdatedAt(next);
    if (nextUpdatedAt >= currentUpdatedAt && (next.meta?.title || next.meta?.kind || next.meta?.area)) {
      current.meta = structuredClone(next.meta);
    }

    for (const [field, state] of Object.entries(next.fields || {})) {
      if (!current.fields[field] || state.at > current.fields[field].at) {
        current.fields[field] = structuredClone(state);
      }
    }
  }
  return normalizeDocument({ schema: 1, records });
}

function parseStored(value) {
  if (!value) return { schema: 1, app: 'bangkok-curated', updatedAt: EMPTY_UPDATED_AT, records: {} };
  try {
    return normalizeDocument(JSON.parse(value));
  } catch {
    throw new Error('Stored feedback document is invalid');
  }
}

async function readFeedbackState(env) {
  const row = await env.DB.prepare('SELECT value_json, revision FROM feedback_state WHERE id = 1').first();
  return {
    document: parseStored(row?.value_json),
    revision: Number.isInteger(row?.revision) ? row.revision : null
  };
}

async function readFeedback(env) {
  return (await readFeedbackState(env)).document;
}

async function writeFeedback(env, body) {
  const incoming = normalizeDocument(body);

  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readFeedbackState(env);
    const merged = mergeDocuments(current.document, incoming);
    const value = JSON.stringify(merged);

    if (value.length > 1_500_000) throw new Error('Feedback document is too large');

    let result;
    if (current.revision === null) {
      result = await env.DB.prepare(`
        INSERT INTO feedback_state (id, value_json, updated_at, revision)
        VALUES (1, ?1, ?2, 1)
        ON CONFLICT(id) DO NOTHING
      `).bind(value, merged.updatedAt).run();
    } else {
      result = await env.DB.prepare(`
        UPDATE feedback_state
        SET value_json = ?1, updated_at = ?2, revision = revision + 1
        WHERE id = 1 AND revision = ?3
      `).bind(value, merged.updatedAt, current.revision).run();
    }

    if ((result.meta?.changes || 0) === 1) return merged;
  }

  throw new Error('Concurrent feedback update conflict');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      if (origin === null) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const headers = corsHeaders(origin === null ? '' : origin);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      try {
        await env.DB.prepare('SELECT 1').first();
        return json({ ok: true }, 200, headers);
      } catch {
        return json({ ok: false }, 503, headers);
      }
    }

    if (url.pathname !== '/api/feedback') return json({ error: 'Not found' }, 404, headers);
    if (origin === null) return json({ error: 'Origin not allowed' }, 403, headers);
    if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401, headers);

    try {
      if (request.method === 'GET') return json(await readFeedback(env), 200, headers);
      if (request.method === 'PUT') {
        const body = await request.json();
        return json(await writeFeedback(env, body), 200, headers);
      }
      return json({ error: 'Method not allowed' }, 405, { ...headers, Allow: 'GET, PUT, OPTIONS' });
    } catch (error) {
      return json({ error: String(error?.message || error) }, 400, headers);
    }
  }
};
