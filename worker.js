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
      const dailyKey = `day_${today}`;

      if (request.method === 'GET') {
        const count = parseInt(await env.COUNTER.get('total') || '0');
        const daily = parseInt(await env.COUNTER.get(dailyKey) || '0');
        return new Response(JSON.stringify({ count, today: daily }), {
          headers: { ...headers, 'Cache-Control': 'public, max-age=600' },
        });
      }

      if (request.method === 'POST') {
        const count = parseInt(await env.COUNTER.get('total') || '0') + 1;
        const daily = parseInt(await env.COUNTER.get(dailyKey) || '0') + 1;
        await env.COUNTER.put('total', String(count));
        await env.COUNTER.put(dailyKey, String(daily));
        return new Response(JSON.stringify({ count, today: daily }), { headers });
      }
    }

    if (url.pathname === '/api/counter/history' && request.method === 'GET') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };
      const today = new Date();
      const keys = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return `day_${d.toISOString().slice(0, 10)}`;
      });
      const values = await Promise.all(keys.map(k => env.COUNTER.get(k)));
      const result = keys.map((k, i) => ({
        date: k.replace('day_', ''),
        count: parseInt(values[i] || '0'),
      }));
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Cache-Control': 'public, max-age=600' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
