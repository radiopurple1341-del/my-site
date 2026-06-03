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

    return env.ASSETS.fetch(request);
  },
};
