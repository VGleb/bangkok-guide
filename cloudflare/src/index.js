const ALLOWED_FIELDS = new Set(['fav','planned','visited','seen','rejected','reason','note']);
const ITEM_ID = /^[a-z0-9_-]{2,65}$/;

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

function validateRecord(id, record) {
  if (!ITEM_ID.test(id) || !record || typeof record !== 'object' || Array.isArray(record)) return null;
  const fields = {};
  for (const [field, state] of Object.entries(record.fields || {})) {
    if (!ALLOWED_FIELDS.has(field) || !state || typeof state !== 'object') continue;
    const at = iso(state.at);
    if (!at) continue;
    let value = state.value;
    if (field === 'reason' || field === 'note') value = text(value, field === 'reason' ? 100 : 350);
    else if (typeof value !== 'boolean') continue;
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

async function readFeedback(env) {
  const [items, fields] = await Promise.all([
    env.DB.prepare('SELECT item_id, title, kind, area, updated_at FROM feedback_items ORDER BY item_id').all(),
    env.DB.prepare('SELECT item_id, field, value_json, updated_at FROM feedback_fields ORDER BY item_id, field').all()
  ]);
  const records = {};
  let updatedAt = '1970-01-01T00:00:00.000Z';

  for (const row of items.results || []) {
    records[row.item_id] = {
      meta: { title: row.title || '', kind: row.kind || '', area: row.area || '' },
      fields: {}
    };
    if (row.updated_at > updatedAt) updatedAt = row.updated_at;
  }

  for (const row of fields.results || []) {
    const record = records[row.item_id] ||= { meta: { title: '', kind: '', area: '' }, fields: {} };
    let value;
    try { value = JSON.parse(row.value_json); } catch { continue; }
    record.fields[row.field] = { value, at: row.updated_at };
    if (row.updated_at > updatedAt) updatedAt = row.updated_at;
  }

  return { schema: 1, app: 'bangkok-curated', updatedAt, records };
}

async function writeFeedback(env, body) {
  if (!body || body.schema !== 1 || !body.records || typeof body.records !== 'object' || Array.isArray(body.records)) {
    throw new Error('Invalid feedback document');
  }

  const entries = Object.entries(body.records);
  if (entries.length > 2000) throw new Error('Too many records');

  const statements = [];
  for (const [id, raw] of entries) {
    const record = validateRecord(id, raw);
    if (!record) continue;

    const times = Object.values(record.fields).map(field => field.at).sort();
    const metaAt = times.at(-1);
    statements.push(
      env.DB.prepare(`
        INSERT INTO feedback_items (item_id, title, kind, area, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(item_id) DO UPDATE SET
          title = excluded.title,
          kind = excluded.kind,
          area = excluded.area,
          updated_at = excluded.updated_at
        WHERE excluded.updated_at >= feedback_items.updated_at
      `).bind(id, record.meta.title, record.meta.kind, record.meta.area, metaAt)
    );

    for (const [field, state] of Object.entries(record.fields)) {
      statements.push(
        env.DB.prepare(`
          INSERT INTO feedback_fields (item_id, field, value_json, updated_at)
          VALUES (?1, ?2, ?3, ?4)
          ON CONFLICT(item_id, field) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
          WHERE excluded.updated_at > feedback_fields.updated_at
        `).bind(id, field, JSON.stringify(state.value), state.at)
      );
    }
  }

  if (statements.length) await env.DB.batch(statements);
  return readFeedback(env);
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
