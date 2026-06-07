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

      const today = new Date().toISOString().slice(0, 10);

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
      const today = new Date();
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
        const today = new Date().toISOString().slice(0, 10);
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
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const fromDate = dates[0];

      const [allTimeRows, weekRows] = await Promise.all([
        env.DB.prepare(
          'SELECT path, SUM(count) as total FROM page_visits GROUP BY path ORDER BY total DESC LIMIT 30'
        ).all(),
        env.DB.prepare(
          'SELECT path, date, count FROM page_visits WHERE date >= ? ORDER BY path, date'
        ).bind(fromDate).all(),
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

      return new Response(JSON.stringify({ allTime: allTimeRows.results, last7days }), { headers });
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
    }

    return env.ASSETS.fetch(request);
  },
};
