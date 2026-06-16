export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/counter') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

      if (request.method === 'GET') {
        const row = await env.DB.prepare(
          'SELECT COALESCE(SUM(count), 0) as total, COALESCE(SUM(CASE WHEN date = ? THEN count ELSE 0 END), 0) as today FROM visits'
        ).bind(today).first();
        return new Response(JSON.stringify({ count: row.total, today: row.today }), {
          headers: { ...headers, 'Cache-Control': 'public, max-age=600' },
        });
      }

      if (request.method === 'POST') {
        await env.DB.prepare(
          'INSERT INTO visits (date, count) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET count = count + 1'
        ).bind(today).run();
        const row = await env.DB.prepare(
          'SELECT COALESCE(SUM(count), 0) as total, COALESCE(SUM(CASE WHEN date = ? THEN count ELSE 0 END), 0) as today FROM visits'
        ).bind(today).first();
        return new Response(JSON.stringify({ count: row.total, today: row.today }), { headers });
      }
    }

    if (url.pathname === '/api/counter/history' && request.method === 'GET') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };
      const today = new Date(Date.now() + 9 * 3600 * 1000);
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const fromDate = dates[0];
      const rows = await env.DB.prepare(
        'SELECT date, count FROM visits WHERE date >= ? ORDER BY date'
      ).bind(fromDate).all();
      const countMap = Object.fromEntries(rows.results.map(r => [r.date, r.count]));
      const result = dates.map(date => ({ date, count: countMap[date] || 0 }));
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Cache-Control': 'public, max-age=600' },
      });
    }

    if (url.pathname === '/api/pageview' && request.method === 'POST') {
      const { path: rawPath } = await request.json().catch(() => ({}));
      if (rawPath) {
        const path = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '');
        const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
        await env.DB.prepare(
          'INSERT INTO page_visits (path, date, count) VALUES (?, ?, 1) ON CONFLICT(path, date) DO UPDATE SET count = count + 1'
        ).bind(path, today).run();
      }
      return new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      };
      const today = new Date(Date.now() + 9 * 3600 * 1000);
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const fromDate = dates[0];

      const [allTimeRows, weekRows, likesRows] = await Promise.all([
        env.DB.prepare(
          'SELECT path, SUM(count) as total FROM page_visits GROUP BY path ORDER BY total DESC LIMIT 30'
        ).all(),
        env.DB.prepare(
          'SELECT path, date, count FROM page_visits WHERE date >= ? ORDER BY path, date'
        ).bind(fromDate).all(),
        env.DB.prepare(
          'SELECT id, count FROM likes WHERE count > 0 ORDER BY count DESC LIMIT 30'
        ).all(),
      ]);

      const pathTotals = {};
      const pathDays = {};
      for (const row of weekRows.results) {
        pathTotals[row.path] = (pathTotals[row.path] || 0) + row.count;
        if (!pathDays[row.path]) pathDays[row.path] = {};
        pathDays[row.path][row.date] = row.count;
      }
      const sortedPaths = Object.keys(pathTotals).sort((a, b) => pathTotals[b] - pathTotals[a]);
      const last7days = {
        dates,
        rows: sortedPaths.map(path => ({
          path,
          days: dates.map(d => pathDays[path][d] || 0),
          total: pathTotals[path],
        })),
      };

      return new Response(JSON.stringify({ allTime: allTimeRows.results, last7days, likes: likesRows.results }), { headers });
    }

    if (url.pathname === '/api/like') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      if (request.method === 'GET') {
        const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 100);
        if (!ids.length) return new Response('{}', { headers });
        const placeholders = ids.map(() => '?').join(',');
        const rows = await env.DB.prepare(
          `SELECT id, count FROM likes WHERE id IN (${placeholders})`
        ).bind(...ids).all();
        const result = Object.fromEntries(rows.results.map(r => [r.id, r.count]));
        return new Response(JSON.stringify(result), { headers });
      }

      if (request.method === 'POST') {
        const { id } = await request.json().catch(() => ({}));
        if (!id) return new Response('{}', { headers });
        await env.DB.prepare(
          'INSERT INTO likes (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1'
        ).bind(id).run();
        const row = await env.DB.prepare('SELECT count FROM likes WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ count: row?.count ?? 1 }), { headers });
      }

      if (request.method === 'DELETE') {
        const { id } = await request.json().catch(() => ({}));
        if (!id) return new Response('{}', { headers });
        await env.DB.prepare(
          'UPDATE likes SET count = MAX(0, count - 1) WHERE id = ?'
        ).bind(id).run();
        const row = await env.DB.prepare('SELECT count FROM likes WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ count: row?.count ?? 0 }), { headers });
      }
    }

    if (url.pathname === '/api/comment') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      if (request.method === 'GET') {
        const article_id = url.searchParams.get('article_id');
        if (!article_id) return new Response('[]', { headers });
        const rows = await env.DB.prepare(
          'SELECT id, parent_id, name, content, created_at, poster_id, is_owner FROM comments WHERE article_id = ? ORDER BY created_at ASC'
        ).bind(article_id).all();
        return new Response(JSON.stringify(rows.results), { headers });
      }

      if (request.method === 'POST') {
        const { article_id, parent_id, name, content, admin_token } = await request.json().catch(() => ({}));
        if (!article_id || !content || content.trim().length === 0 || content.length > 300) {
          return new Response(JSON.stringify({ error: 'invalid' }), { headers, status: 400 });
        }
        const trimmedName = (name || '').trim().slice(0, 50) || '名無し';
        const trimmedContent = content.trim();
        const created_at = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
        const last = await env.DB.prepare(
          'SELECT content FROM comments WHERE article_id = ? ORDER BY created_at DESC LIMIT 1'
        ).bind(article_id).first();
        if (last && last.content === trimmedContent) {
          return new Response(JSON.stringify({ error: 'duplicate' }), { headers, status: 429 });
        }
        const is_owner = (env.ADMIN_TOKEN && admin_token === env.ADMIN_TOKEN) ? 1 : 0;
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const date = created_at.slice(0, 10);
        const hashInput = new TextEncoder().encode(ip + date + (env.ID_SALT || 'salt'));
        const hashBuffer = await crypto.subtle.digest('SHA-256', hashInput);
        const poster_id = is_owner ? '管理人' : Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
        const result = await env.DB.prepare(
          'INSERT INTO comments (article_id, parent_id, name, content, created_at, poster_id, is_owner) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(article_id, parent_id || null, trimmedName, trimmedContent, created_at, poster_id, is_owner).run();
        return new Response(JSON.stringify({ id: result.meta.last_row_id, name: trimmedName, content: trimmedContent, created_at, poster_id, is_owner }), { headers });
      }

      if (request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        const token = url.searchParams.get('token');
        if (!id || !env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), { headers, status: 401 });
        }
        await env.DB.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').bind(Number(id), Number(id)).run();
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
